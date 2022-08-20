const request = require('request');
const crypto = require('crypto')
const {
  saveTeamInfo,
  saveAcronym,
  addOneTransaction,
  deleteAcronym,
  getTeamInfo,
  getAcronym,
  getAcronyms
} = require('./firebase')

const NO_DEFINITION_ERROR_MESSAGE = (acronym) => `Sorry, _${acronym}_ has not been defined yet!\nYou can define a new acronym using _/explain ${acronym} definition_`
const THANK_YOU_MESSAGE = (acronym) => `Thanks for your definition of _${acronym}_!`
const NEEDS_DEFINITION_MESSAGE = (acronym, username) => `${username} needs to define *_${acronym}_*!\nYou can define a new acronym using _/explain ${acronym} definition_`
const WAS_DEFINED_MESSAGE = (acronym, username, definition) => `${username} just defined _${acronym}_ as\n>${definition}`
const ACRONYM_DELETED_MESSAGE = acronym => `You have successfully removed the definition(s) for _${acronym}_`
const LISTALL_MESSAGE = message => `This is a list of all definitions for your Slack workspace. Copy and paste it into your next workspace to import the data.\n\n${message}`
const DEFINITION_MESSAGE = (acronym, definitions) => {
  let message = "*" + acronym + ":*"
  definitions.map((definition, index) => {
    message += "\n*" + (index+1) + ")* " + definition
  })

  return message
}

const postToChannelUrl = (text, channel_id, token) => {
  return (
    'http://slack.com/api/chat.postMessage?' +
    'token=' + token +
    '&channel=' + channel_id +
    '&text=' + text
  )
}

const postToChannel = (text, channel_id, token) => {
  const url = postToChannelUrl(text, channel_id, token)
  request(url, function(error, response, body) {
    if (!error && body && !body.error && response.statusCode == 200) { 
      console.log('Success');
    } else { 
      console.log(error || (body && body.error));
    }
  });
}

const handleDefinition = async (input, appId, username, res) => {
  const inputArr = input.split(' ') // [acronym] [definition]

  if (inputArr.length === 0) {
    return res.json({ text: NO_INPUT_ERROR_MESSAGE })
  }

  const acronym = inputArr[0].toLowerCase()

  if (acronym === 'help') {
    return res.json({ text: HELP_MESSAGE })
  } else if (acronym === 'remove' && inputArr.length >= 2) {
    const acronymToDelete = inputArr[1].toLowerCase()
    deleteAcronymHelper(res, acronymToDelete, appId)
    return
  }

  const teamSnapshot = await getTeamInfo(appId).once('value')
  const { channel_id, token } = teamSnapshot.val()

  if (acronym === 'listall') {
    allAcronymHelper(res, appId)
    return
  }
  
  const acronymSnapshot = await getAcronym(acronym, appId).once('value')
  const definitions = acronymSnapshot.val()
  
  try {
    if (inputArr.length === 1) {
      // Getting the definition
      postDefinition(res, acronym, definitions, channel_id, username, token)
    } else {
      // Defining the acronym
      const definition = inputArr.slice(1).join(" ")
      newDefinition(res, acronym, definition, channel_id, token, username, appId)
    }
  } catch (error) {
    console.log(error)
    res.json({ ...error })
  }
}

const postDefinition = (res, acronym, definitions, channel_id, username, token) => {
  addOneTransaction('acronymsExplained')
  if (definitions) {
    addOneTransaction('acronymsExplainedSuccess')
    res.json({ text: DEFINITION_MESSAGE(acronym, definitions) })
  } else {
    postToChannel(NEEDS_DEFINITION_MESSAGE(acronym, username), channel_id, token)
    addOneTransaction('acronymsExplainedFailed')
    res.json({ text: NO_DEFINITION_ERROR_MESSAGE(acronym) })
  }
}

const newDefinition = (res, acronym, definition, channel_id, token, username, app_id) => {
  saveAcronym(acronym, definition, app_id)
  postToChannel(WAS_DEFINED_MESSAGE(acronym, username, definition), channel_id, token)
  addOneTransaction('acronymsDefined')
  res.json({ text: THANK_YOU_MESSAGE(acronym) })
}

const deleteAcronymHelper = (res, acronym, app_id) => {
  addOneTransaction('deletedAcronyms')
  deleteAcronym(acronym, app_id)
  res.json({ text: ACRONYM_DELETED_MESSAGE(acronym) })
}

const allAcronymHelper = async (res, app_id) => {
  const acronymsSnapshot = await getAcronyms(app_id).once('value')
  const acronyms = acronymsSnapshot.val()

  const message = Object.keys(acronyms)
  .map(key => acronyms[key].map(val => '/explain ' + key + ' ' + val))
  .map(lines => lines.join('\n'))
  .join('\n')

  res.json({ text: LISTALL_MESSAGE(message) })
}

exports.oathOptions = code => {
  const uri = (
    'https://slack.com/api/oauth.access?code='
    + code
    + '&client_id='+process.env.CLIENT_ID
    + '&client_secret='+process.env.CLIENT_SECRET
    + '&redirect_uri='+process.env.REDIRECT_URI
  )

  return { uri, method: 'GET' }
}

exports.authorizeOptions = code => {
  const uri = (
    'https://slack.com/api/oauth.access?client_id='
    + process.env.CLIENT_ID
    + '&client_secret='+process.env.CLIENT_SECRET
    + '&code='+code
    + '&redirect_uri='+process.env.REDIRECT_URI
  )

  return { uri, method: 'GET' }
}

exports.sign = (req, body) => {
  addOneTransaction('messagesSigned')
  const timestamp = req.headers['x-slack-request-timestamp']
  const sig_basestring = 'v0:' + timestamp + ':' + body
  const hmac = crypto.createHmac('sha256', process.env.SIGNING_SECRET)
  hmac.update(sig_basestring)
  return `v0=${hmac.digest('hex')}`
}

exports.compare = (signature, req) =>
  crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(req.headers['x-slack-signature']))

exports.saveToken = params => {
  saveTeamInfo(params.team_id, params.incoming_webhook.channel_id, params.access_token)
  addOneTransaction('activeTeams')
}

exports.handleRequest = (req, res) => {
  const { text, team_id, enterprise_id, user_name } = req.body
  const appId = enterprise_id || team_id

  const inputs = text.split('\n')

  inputs.map(input => {
    const startString = "/explain "
    let parsed_input = input
    if (input.startsWith(startString)) {
      parsed_input = input.substr(startString.length)
    }
    handleDefinition(parsed_input, appId, user_name, res)
  })
}
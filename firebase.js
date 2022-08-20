require('dotenv').config()
const app = require('firebase')

var config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

app.initializeApp(config);
const db = app.database();

const addOneTransaction = stat => 
  db.ref(`stat/${stat}`).transaction(count => (count || 0) + 1)

const getAcronyms = (team_id) => 
  db.ref(`acronyms/${team_id}`)

const getAcronym = (acronym, team_id) =>
  db.ref(`acronyms/${team_id}/${acronym}`)

const getDefinition = (acronym, definition, team_id) => {
  db.ref(`acronyms/${team_id}/${acronym}`, equalTo(definition))
}

const saveAcronym = (acronym, definition, team_id) => {
  getAcronym(acronym, team_id).once('value', snapshot => {
    const definitions = snapshot.val()
    const newDefinitions = definitions ? definitions.concat(definition) : [definition]

    getAcronyms(team_id).update({ [acronym]: newDefinitions })
  })
}

const deleteAcronym = (acronym, team_id) => {
  getAcronym(acronym, team_id).remove()
}

const deleteDuplicateDefinitions = (acronym, team_id) => {
  var numRemoved = 0
  getAcronym(acronym, team_id).once('value', snapshot => {
    const oldDefinitions = snapshot.val()
    // thanks to https://stackoverflow.com/a/46741042 for help with this code
    const newDefinitions = oldDefinitions
      .reduce((definitions, definition) => {
        var normalize = def => def.toLowerCase()
        var normalizedDefinition = normalize(definition)
        if (definitions.every(otherElement => normalize(otherElement) !== normalizedDefinition))
          definitions.push(definition)
        return definitions
      }, [])
    getAcronyms(team_id).update({ [acronym]: newDefinitions })
    numRemoved = oldDefinitions.length - newDefinitions.length
  })
  return numRemoved
}

const getTeamInfo = (team_id) =>
  db.ref(`tokens/${team_id}`)

const saveTeamInfo = (team_id, channel_id, token) =>
  getTeamInfo(team_id).set({ channel_id, token })


module.exports = {
  getAcronym,
  getAcronyms,
  getDefinition,
  saveAcronym,
  getTeamInfo,
  saveTeamInfo,
  addOneTransaction,
  deleteAcronym,
  deleteDuplicateDefinitions,
}
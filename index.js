require('dotenv').config()
const request = require('request');
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const {
  oathOptions,
  authorizeOptions,
  sign,
  compare,
  saveToken,
  handleRequest
} = require('./utils')

const app = new express()
app.use(bodyParser.urlencoded({
  extended: true,
  verify: (req, res, body, encoding) => {
    const signature = sign(req, body)

    if (!compare(signature, req)) {
      throw new Error('incorrect signature')
    }
  }
}))
app.use('/public', express.static(path.join(__dirname + '/public')));
app.use('/views', express.static(path.join(__dirname + '/views')));

const NO_INPUT_ERROR_MESSAGE = "Please enter an acronym to define!"
const HELP_MESSAGE = "Get the definition of a word with /explain <word> or add a definition with /explain <word> <definition>"

app.get('/', (req, res) => res.sendFile(path.join(__dirname+'/index.html')))

app.post('/bot', async (req, res) => handleRequest(req, res))

app.get('/redirect', (req, res) => {
  const options = oathOptions(req.query.code)
  
  request(options, (error, response, body) => {
    const JSONresponse = JSON.parse(body)
    if (!JSONresponse.ok) {
      res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
    } else {
      res.send("Success!")
    }
  })
})

app.get('/authorize', (req, res) => {
  const options = authorizeOptions(req.query.code)
	request(options, (error, response, body) => {
    const JSONresponse = JSON.parse(body)
    if (!JSONresponse.ok) {
      res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
    } else {
      saveToken(JSONresponse)
      res.redirect('/success')
    }
  })
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname+'/success.html'))
});

const port = process.env.PORT || 8000
app.listen(port, () => {
  console.log(`Server started on localhost with port ${port}`)
})
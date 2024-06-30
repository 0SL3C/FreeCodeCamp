require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const DNS = require('dns');
app.use(bodyParser.urlencoded({extended : false}));

let mongoose = require('mongoose');
const { url } = require('inspector');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const urlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  short_url: Number
})
let urlModel = mongoose.model('URL', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// ENDPOINT

app.post('/api/shorturl', async (req,res) => {
  let {url: _url} = req.body;
  try{
    _url = new URL(_url);
    const dnsLookup = DNS.lookup(_url.hostname, async (err, address) => {
      if(!address){
        res.json({ error: 'invalid url' })
      }else{
        try{
          const finder = await urlModel.find({
            url: _url.href
          })
          if(finder){
            res.json({
              original_url: finder[0].url,
              short_url: finder[0].short_url
            })
          }
          console.log("Found");
        }catch(err){
          const urlCount = await urlModel.countDocuments({});
          const urlDoc = {
            url: _url.href,
            short_url: urlCount
          }
          await urlModel.create(urlDoc);
          res.json({
            original_url: urlDoc.url,
            short_url: urlDoc.short_url
          })
          console.log("Sucess");
          console.log(urlCount);
        }
      }
    })
  }catch(err){
    res.json({ error: 'invalid url' })
  }
})

app.get('/api/shorturl/:number', async (req,res) => {
    const {number: _number} = req.params;
    if(isNaN(_number)){
      res.json({ error: 'invalid url' })
      console.log(_number)
    }else{
      const finder = await urlModel.find({short_url: _number});
      const redirect = await finder[0].url;
      if (finder){
        res.redirect(redirect);
      }
    }
    
    
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

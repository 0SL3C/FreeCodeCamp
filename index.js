const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String
}) 
let exerciseModel = mongoose.model('Exercise', exerciseSchema);

const userSchema = new mongoose.Schema({
  username: String,
  log: [exerciseSchema]
})
let userModel = mongoose.model('User', userSchema);

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

app.use(cors())
app.use(express.static('public'))
app.use((req, res,next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`)
  next();
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  try{
    const docs = await userModel.find();
    res.json(docs)
  }catch(err){
    console.log(err);
  }
})


app.get('/api/users/:_id/logs', (req, res) => {
  userModel.findById(req.params._id).then((result) => {
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    let userObj = { ...result.toObject() }; // To avoid modifying the original object

    if (req.query.from || req.query.to) {
      let fromDate = req.query.from ? new Date(req.query.from) : new Date(0);
      let toDate = req.query.to ? new Date(req.query.to) : new Date();

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      userObj.log = userObj.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime();
        return sessionDate >= fromDate && sessionDate <= toDate;
      });
    }

    if (req.query.limit) {
      userObj.log = userObj.log.slice(0, parseInt(req.query.limit));
    }

    userObj.count = userObj.log.length;

    res.json(userObj);
  }).catch((err) => {
    res.status(500).json({ error: 'Internal server error' });
  });
});
  
  // const { _id } = req.params;
  // const {from: _from, to: _to, limit: _limit} = req.query;
  // const from = _from ? new Date(_from) : new Date();
  // const to = _to ? new Date(_to) : new Date();
  // const limit = _limit ? Number(_limit) : 0;

  // try{
  //   const user = await userModel.findById(_id);
  //   if (!user) {
  //     return res.json({error: 'User not found'})
  //   }        
    
  //   const filteredLogs = await userModel.find({
  //     _id: _id
  //   });
    
  //   console.log(`Filtered logs:\n${filteredLogs}`);

  //   const response = {
  //     _id: _id,
  //     username: user.username
  //   }

  //   if(_from){
  //     // user.log.find({
  //     //   date: {
  //     //     $gte: from
  //     //   }
  //     // })
  //     // console.log(`from = ${from} \n user.log = ${user.log}\n`);
  //   }else if(_to){
  //     user.log = user.log.filter((log) => {
  //       return log.date <= to
  //     })
  //     console.log(`to = ${to} \n user.log = ${user.log}\n`);
  //   }

  //   const count = user.log.length;

  //   Object.assign(response, { count: count });

  //   Object.assign(response, { log: user.log });

  //   res.json(response);

  // }catch(err){
  //   console.log(err);
  // }

app.post('/api/users', async (req, res) => {
  const {username: _username} = req.body;

  if (!_username) {
    console.log("User creation failed: Username is required!");
    return res.json({error: 'Username is required'});
  }

  // try{
  //   const doc = await userModel.findOne({username: _username});
  //   if (doc) {
  //     return res.json({error: 'Username already exists'})
  //   }
  // }catch(err){
  //   console.log(err);
  // }
    
  const newUser = new userModel({username: _username});
  try{
    await newUser.save();
    res.json({username: _username, _id: newUser._id})
    console.log(`User created. User: "${_username}", ID: "${newUser._id}"`);
  }catch(err){
    console.log(err);
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const {description: _description, duration: _duration, date: _date} = req.body;
  const { _id } = req.params;

  if (!_description || !_duration) {
    return res.json({error: 'description and duration are required'})
  }
  const date = _date ? new Date(_date) : new Date();
  const newExercise = new exerciseModel({description: _description, duration: _duration, date: date.toDateString()});
  try{
    await newExercise.save();
    const user = await userModel.findById(_id);

    user.log.push(newExercise);
    await user.save();
    res.json({
      _id: user._id,
      username: user.username,
      date: newExercise.date,
      duration: newExercise.duration,
      description: newExercise.description
    })
  }catch(err){  
    console.log(err);
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})



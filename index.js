const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose");
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new Schema({
  username: {type: String, required: true}
}, {versionKey: false});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now}
},{versionKey: false});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", async (req, res) => {
  const user = new User({ username: req.body.username });

  try {
    await user.save();
    return res.json(user);
  } catch (error) {
    console.log(error);
  }
});

app.get("/api/users", async function (req, res){
  const users = await User.find();

  if(users.length === 0) {
    res.send("Could not find users");
  } else {
    res.send(users);
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);

    const exercise = new Exercise({
      description,
      duration,
      date: date ? new Date(date) : new Date(),
      user_id: user._id
    });

    await exercise.save();

    return res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
      _id: user._id,
    });
  } catch (error) {
    res.send("Could not save the exercise, please verify the ID and the required fields");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  
  let dateObject = {};

  if (from){
    dateObject["$gte"] = new Date(from);
  } 

  if (to) {
    dateObject["$lte"] = new Date(to);
  }

  let filterByUserId = {
    user_id: id
  }

  if (from || to) {
    filterByUserId.date = dateObject;
  }

  const exercises = await Exercise.find(filterByUserId).limit(+limit ?? 1000);

  const log = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

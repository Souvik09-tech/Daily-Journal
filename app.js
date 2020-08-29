//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require ("passport");
const passportLocalMongoose = require ("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
const $ = require("jquery")(window);
// const bootStrap = require("bootstrap");


const homeStartingContent = "Hey !! Welcome ...  ";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://souvik-admin:7045@clusterblog.zdqom.mongodb.net/bloggerDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);



const defaultUsers = [];
const messageSchema = new mongoose.Schema({
  title: String,
  content: String,

});

const userSchema = new mongoose.Schema({
  messages: [messageSchema],
  email: String,
  password: String,
  googleId: String
});



userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://daily-journal-web.herokuapp.com/auth/google/home",
      // callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
      },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


// -------------------------------Cover Page -------------------------------

app.get("/",function(req,res){
  res.render("cover");
});

// ----------X--------------------Cover Page -------------X----------------



app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));


  app.get("/auth/google/home",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/home");
    });




app.get("/home",function(req,res){
  User.find({_id: req.user.id}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("home",{startingContent: homeStartingContent, posts: foundUsers});
      }
    }
  })
});

app.get("/compose", function(req, res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
});
app.get("/check", function(req, res){
  if(req.isAuthenticated()){
    res.redirect("/home");
  }else{
    res.redirect("/login");
  }
});

app.post("/compose", function(req, res){
  const user = new User({
    messages: [{
      title: req.body.userTitle,
      content: req.body.userBody
    }]

  });



    User.findById(req.user.id,function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.messages.push({title: req.body.userTitle, content: req.body.userBody });

        foundUser.save(function(){

          res.redirect("/home");
        });
      }
    }
  });
});






// app.get("/users/messages/:messageId", function(req, res){
//
//
//   User.findById(req.user.id, function(err, user){
//
//
//       const requestedUserId = req.params.messageId;
//       console.log(requestedUserId);
      // console.log(user);
      // user.findOne({_id: req.user.id}, function(err, users){
      //   console.log(users);
    //
    // user.messages.find({_id: requestedUserId}, function(err, foundMessage){
    //   console.log(foundMessage);
    //
    // res.render("post", {
    //   title: messages.title,
    //   content: messages.content
    // });
  //
//   });
//
// });
// });

app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

//----------------------------------------------Register & login -----------------------------------------------

app.post("/register",function(req,res){


  User.register({username: req.body.username},req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home");
      });
    }
  });
});

app.post("/login", function(req,res){
 const user = new User({
   username: req.body.username,
   password: req.body.password
 });
 req.login(user, function(err){
   if(err){
     console.log(err);
   }else{
     passport.authenticate("local")(req,res,function(){
       res.redirect("/home");
     });
   }
 });
});

// -------------------------------------( Register & Login)---------------------------------------------------



app.get("/register",function(req,res){
  res.render("register");
});

// const sign_in_btn = document.getElementById("sign-in-btn");
// const sign_up_btn = document.getElementById("sign-up-btn");
// const container = document.getElementByClassName("container");
//
// sign_up_btn.addEventListener("click", () => {
//   container.classList.add("sign-up-mode");
// });
//
// sign_in_btn.addEventListener("click", () => {
//   container.classList.remove("sign-up-mode");
// });

app.get("/login",function(req,res){
  res.render("authenticate");
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server has started successfully");
});

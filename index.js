require("dotenv").config()
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGOURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
    });

// Define the User schema
const userSchema = new mongoose.Schema({
    name: String,
    number: String,
    profilePhoto: String,
    email: String,
});

const User = mongoose.model('User', userSchema);

const sendOTP = (number, otp) => {
    const accountSid = process.env.TWILLIO_SID;
    const authToken = process.env.TWILLIO_AUTH;
    const client = twilio(accountSid, authToken);
    // console.log(number);
    return client.messages.create({
        body: `Your OTP for authentication is ${otp}`,
        from: process.env.TWILLIO_NUM,
        to: number,
    }).then(message => console.log(message.sid));
    ;
}

const verifyOtp = (sentOTP, recievedOtp) => sentOTP === recievedOtp;
let newUser, otp, userNumber;
app.post('/user', (req, res) => {
    const { name, number, profilePhoto, email } = req.body;

    userNumber = number;
    // Generate a random OTP
    otp = Math.floor(100000 + Math.random() * 900000);

    // Save the user to the database
    newUser = new User({ name, number, profilePhoto, email });
    console.log(typeof otp);
    sendOTP(number, otp);
});

app.post("/user/verify", (req, res) => {
    const { enteredOtp } = req.body;
    console.log(typeof enteredOtp);
    if (verifyOtp(otp, enteredOtp)) {
        newUser.save()
            .then(() => {
                // Generate a JWT token with the user's phone number and OTP
                const token = jwt.sign({ userNumber, otp }, process.env.JWT_SECRET);
                console.log(token);
                res.json({ token });
            })
            .catch((err) => {
                console.error('Error creating user:', err);
                res.status(500).json({ error: 'Failed to create user' });
            });
    }

})

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
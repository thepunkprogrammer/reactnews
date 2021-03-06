const express = require('express');
const authRouter = express.Router();
const models =  require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mailer = require('../utils/mailer');
require('dotenv').config({path: '.variables.env'});

function createUser(body, res) {
    models.Users.create(body)
        .then(user => {
            const verificationBody = {
                user: user.username, email: user.email
            }
            const hash = bcrypt.hashSync(JSON.stringify(verificationBody), 10);
            const link = `${process.env.BASE_URL}/api/verifyemail?email=${user.email}&hash=${hash}`;
            return mailer(user.email, link).then(response => {
                res.status(201).json({
                    message: `successfully registered ${user.username}, please check you email`,
                });
            }).catch(err => {
                throw new Error(err);
            });
        })
        .catch(err => {
            return res.status(401).json({
                message: err
            });
        });
}

function getCurrentUser(body, res) {
    models.Users.findOne({
        where: {
            username: body.username
        }
    }).then(user => {
        const match = bcrypt.compareSync(body.password, user.password)
        if (!match) {
            return res.status(401).json({
                message: 'Wrong password'
            });
        } else if(!user.active) {
            return res.status(401).json({
                message: 'user not verified yet'
            });
        } else {
            const jwtBody = {
                email: user.email,
                password: user.password
            }
            const token = jwt.sign(jwtBody, process.env.SECRET)
            return res.status(200).json({
                message: "Login successful",
                token
            });
        }
    }).catch(err => {
        return res.status(401).json({
            message: err
        });
    });
}

authRouter.route('/register')
    .post(async (req, res) => {
        const {firstName, lastName, email, username, password, categories, languages, countries} = req.body;
        if (!firstName) {
            return res.status(400).json({
                message: 'First Name is required'
            });
        } else if (!lastName) {
            return res.status(400).json({
                message: 'Last Name is required'
            });
        } else if (!email) {
            return res.status(400).json({
                message: 'Email is required'
            });
        } else if (!username) {
            return res.status(400).json({
                message: 'Username is required'
            });
        } else if (!password) {
            return res.status(400).json({
                message: 'Password is required'
            });
        } else if (!categories) {
            return res.status(400).json({
                message: 'Category  is required'
            });
        } else if (!languages) {
            return res.status(400).json({
                message: 'Preferred language is required'
            });
        } else if (!countries) {
            return res.status(400).json({
                message: 'Country is required'
            });
        } else {
            const passwordHash = bcrypt.hashSync(password, 10);
            const requestBody = {
                firstName, lastName, email, username, password: passwordHash, categories, languages, countries, active: false
            }
            createUser(requestBody, res);
        }
    })

authRouter.route('/login')
    .post(async (req, res) => {
        const {username, password} = req.body;
        if (!username) {
            res.status(400).json({
                message: 'Username should not be blank'
            });
        } else if (!password) {
            res.status(400).json({
                message: 'Password should not be blank'
            });
        }
        getCurrentUser({username, password}, res);
    })

module.exports = authRouter;
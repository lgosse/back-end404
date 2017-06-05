'use strict';

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const SlackBot = require('slackbots');
const request = require('request');
const cors = require('cors')({ origin: true });

const gmailEmail = functions.config().gmail.email;
const gmailPassword = functions.config().gmail.password;
const mailTransport = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailEmail, pass: gmailPassword } });

const bot = new SlackBot({
    token: functions.config().slackservice.token, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Support t_ERROR 404'
});

const APP_NAME = 'BDE T_ERROR 404';

exports.sendNewUserNotification = functions.database.ref('/mails/users/{mailId}')
    .onWrite(event => {
        if (event.data.previous.exists()) {
            return;
        }

        if (!event.data.exists() || !event.data.val().login) {
            return;
        }

        var params = {
            icon_emoji: ':hamster_dance:'
        };

        var message = 'New user on our Website: ' + event.data.val().login + '. Added to our mailing list';

        bot.postMessageToChannel(functions.config().slackservice.channel, message, params);
    });

exports.sendIdeaBoxNotification = functions.database.ref('/contact/{contactId}')
    .onWrite(event => {
        if (event.data.previous.exists()) {
            return;
        }

        if (!event.data.exists()) {
            return;
        }

        // [START eventAttributes]
        const mailOptions = {
            from: '"T_ERROR 404 Support" <noreply@bde.42.fr>',
            to: functions.config().gmail.toaddr
        };

        mailOptions.subject = event.data.val().subject;
        mailOptions.text = event.data.val().email + ' sent us : ' + event.data.val().message;

        mailTransport.sendMail(mailOptions).then(() => {
            console.log('New email sent to BDE');
        });

    });

exports.sendIdeaBoxNotification = functions.database.ref('/subscriptions/{eventTitle}/{studentLogin}')
    .onWrite(event => {
        if (event.data.previous.exists()) {
            return;
        }

        if (!event.data.exists()) {
            return;
        }

        // [START eventAttributes]
        const mailOptions = {
            from: '"BDE42 - T_ERROR 404 Support" <noreply@bde.42.fr>',
            to: event.data.val() + '@student.42.fr'
        };

        mailOptions.subject = 'Inscription à un event T_ERROR 404';
        mailOptions.text = 'Coucou ' + event.data.val() + ' ! Merci de t\'être inscrit à ' + event.params.eventTitle;

        mailTransport.sendMail(mailOptions).then(() => {
            console.log('New confirmation email sent to Student');
        });

    });

exports.sendContactSlackNotification = functions.database.ref('/contact/{contacId}')
    .onWrite(event => {
        if (event.data.previous.exists()) {
            return;
        }

        if (!event.data.exists()) {
            return;
        }

        var params = {
            icon_emoji: ':e-mail:'
        };

        var message = 'We got a new message from ' + event.data.val().email + '. Subject : ' + event.data.val().subject + ' - Message : ' + event.data.val().message;

        bot.postMessageToChannel(functions.config().slackservice.channel, message, params);
    })

exports.sendSubcriptionSlackNotification = functions.database.ref('/subscriptions/{eventTitle}/{studentLogin}')
    .onWrite(event => {
        if (event.data.previous.exists()) {
            return;
        }

        if (!event.data.exists()) {
            return;
        }

        var params = {
            icon_emoji: ':hamster_dance:'
        };

        var message = 'This student: ' + event.data.val() + ' just subscribed to : ' + event.params.eventTitle + '!';

        bot.postMessageToChannel(functions.config().slackservice.channel, message, params);
    })

exports.login = functions.https.onRequest((req, res) => {

    if (req.method !== 'GET') {
        console.error('Forbidden method called: ' + req.method + '. Trace: ' + JSON.stringify(req));
        res.status(403).send('Forbidden method.');

        return;
    }

    var postData = {
        grant_type: 'authorization_code',
        client_id: functions.config().intra.uid,
        client_secret: functions.config().intra.secret,
        redirect_uri: 'https://us-central1-website-d0a07.cloudfunctions.net/login',
        code: req.query.code
    };

    request({
        url: 'https://api.intra.42.fr/oauth/token',
        method: 'POST',
        json: true,
        body: postData
    }, function(error, response, body) {
        console.log(body.login + ' just loggued in.');

        res.status(200).redirect('https://bde.42.fr/home?access_token=' + body.access_token);
    })

    return;

})

exports.logindev = functions.https.onRequest((req, res) => {

    if (req.method !== 'GET') {
        console.error('Forbidden method called: ' + req.method + '. Trace: ' + JSON.stringify(req));
        res.status(403).send('Forbidden method.');

        return;
    }

    cors(req, res, () => {
        var postData = {
            grant_type: 'authorization_code',
            client_id: functions.config().intra.uid,
            client_secret: functions.config().intra.secret,
            redirect_uri: 'https://us-central1-website-d0a07.cloudfunctions.net/logindev',
            code: req.query.code
        };

        request({
            url: 'https://api.intra.42.fr/oauth/token',
            method: 'POST',
            json: true,
            body: postData
        }, function(error, response, body) {
            res.status(200).redirect('https://staging.prin.tf/home?access_token=' + body.access_token);
        })
    })

    return;

})

exports.userinfo = functions.https.onRequest((req, res) => {

    if (req.method !== 'GET') {
        console.error('Forbidden method called: ' + req.method + '.');
        res.status(403).send('Forbidden method.');

        return;
    }

    cors(req, res, () => {
        request({
            url: 'https://api.intra.42.fr/v2/me',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + req.query.access_token
            }
        }, function(error, response, body) {
            if (error) {
                console.log(error);
            }
            let data = JSON.parse(body, function(key, value) {
                if (key == 'parent') { return value.id; } else { return value; }
            });
            res.status(200).send({
                first_name: data.first_name,
                last_name: data.last_name,
                login: data.login,
                email: data.email
            });
        });
    })

})

exports.sendmail = functions.https.onRequest((req, res) => {

    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'content-type');
        res.status(200).send();

        return;
    }

    if (req.method !== 'POST') {
        console.error('Forbidden method called: ' + req.method + '.');
        res.status(403).send('Forbidden method.');

        return;
    }

    const mailOptions = {
        subject: req.body.subject,
        from: '"toto from @bde.42.fr" <noreply@bde.42.fr>',
        text: 'ntm',
        to: req.body.bcc,
        html: req.body.text
    };

    console.log(mailOptions);

    mailTransport.sendMail(mailOptions).then((res) => {
        console.log(JSON.stringify(res));
        console.log('New email sent to ' + req.body.bcc);
    }).catch(err => {
        console.log(JSON.stringify(err));
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.status(200).send();

    return;

})
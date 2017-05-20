'use strict';

const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const SlackBot = require('slackbots');
const request = require('request');

const gmailEmail = encodeURIComponent(functions.config().gmail.email);
const gmailPassword = encodeURIComponent(functions.config().gmail.password);
const mailTransport = nodemailer.createTransport(
    `smtps://${gmailEmail}:${gmailPassword}@smtp.gmail.com`);

const bot = new SlackBot({
    token: functions.config().slackservice.token, // Add a bot https://my.slack.com/services/new/bot and put the token  
    name: 'Support t_ERROR 404'
});

const APP_NAME = 'BDE T_ERROR 404';

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
            from: '"T_ERROR 404 Support" <noreply@t_error404.com>',
            to: 'bde42.l404@gmail.com'
        };

        mailOptions.subject = event.data.val().subject;
        mailOptions.text = event.data.val().email + ' sent us : ' + event.data.val().message;

        return mailTransport.sendMail(mailOptions).then(() => {
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
            from: '"T_ERROR 404 Support" <noreply@t_error404.com>',
            to: event.data.val() + '@student.42.fr'
        };

        mailOptions.subject = 'Inscription à un event T_ERROR 404';
        mailOptions.text = 'Coucou ' + event.data.val() + ' ! Merci de t\'être inscrit à notre évènement !';

        return mailTransport.sendMail(mailOptions).then(() => {
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

        bot.postMessageToChannel('support', message, params);
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

        bot.postMessageToChannel('support', message, params);
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
        redirect_uri: 'localhost:4200/home',
        code: req.query.code
    };

    request({
        url: 'https://api.intra.42.fr/oauth/token',
        method: 'POST',
        json: true,
        body: postData
    }, function(error, response, body) {
        res.status(200).send(body);
    })

    console.log(req.query.code);

    // res.status(200).send();
    return;

})
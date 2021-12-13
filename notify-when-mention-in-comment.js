/**
 * This notify via Slack when user was mention in comment. Auto match user email from YT to Slack user id 
 */

const entities = require('@jetbrains/youtrack-scripting-api/entities');
const http = require('@jetbrains/youtrack-scripting-api/http');
const SLACK_BOT_TOKEN = 'PUT_HERE_BOT_TOKEN';
const SLACK_API = 'https://slack.com/api/';

exports.rule = entities.Issue.onChange({
  title: 'Send notification to slack when an issue is reported Assignee change',
  guard: (ctx) => {
    return ctx.issue.comments.added.isNotEmpty();
  },
  action: (ctx) => {
    const issue = ctx.issue;

    var issueLink = '<' + issue.url + "|" + issue.id + '>';
    var blocks = function (author, comment) {
      return [{
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": ":speech_balloon: " + author + " mention You",
          "emoji": true
        }
      }, {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": issue.summary + " [" + issueLink + "]"
        }
      },
      {
        "type": "context",
        "elements": [{
          "type": "mrkdwn",
          "text": "> "+comment
        }]
      },
      {
        "type": "section",
        "fields": [{
            "type": "mrkdwn",
            "text": "*State:*\n" + issue.fields.State.name
          },
          {
            "type": "mrkdwn",
            "text": "*Priority:*\n" + issue.fields.Priority.name
          },
          {
            "type": "mrkdwn",
            "text": "*Assignee:*\n" + (issue.fields.Assignee ? issue.fields.Assignee.fullName : '')
          },
          {
            "type": "mrkdwn",
            "text": "*Updated by:*\n" + author
          }
        ]
      }
    ];
    };


    issue.comments.added.forEach(function(comment) {
      //var commentLink = '<' + comment.url + "|" + issue.summary + '>';
      var author = comment.author.fullName;
      var commentText = comment.text;
      var regexp = /(^|\s)@([A-ź]+)/g;
      const result = commentText.matchAll(regexp);
      for (const match of result) {
        var user = entities.User.findByLogin(match[2]);
        if (user) {
          var connection = new http.Connection(SLACK_API, null, 2000);
          var userResponse = connection.postSync('users.lookupByEmail', [{
            name: 'token',
            value: SLACK_BOT_TOKEN
          }, {
            name: 'email',
            value: user.email
          }]);
          if (userResponse.isSuccess) {
            userResponse = JSON.parse(userResponse.response);
            if (userResponse.ok) {
              connection.addHeader({
                name: 'Content-Type',
                value: 'application/json'
              });
              connection.addHeader({
                name: 'Authorization',
                value: 'Bearer ' + SLACK_BOT_TOKEN
              });
              var messageResponse = connection.postSync('chat.postMessage', '', JSON.stringify({
                'channel': userResponse.user.id,
                'as_user': 'true',
                'blocks': blocks(author, commentText),
                'text': ":speech_balloon: " + author + " mention You in YouTrack",
                'pretty': '1'
              }));
            }
          }
        }
      }
    });
  },
  requirements: {
  }
});

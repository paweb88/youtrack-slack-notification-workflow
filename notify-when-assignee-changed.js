/**
 * This notify via Slack when assigne or state has changed. Auto match user email from YT to Slack user id 
 */

const entities = require('@jetbrains/youtrack-scripting-api/entities');
const http = require('@jetbrains/youtrack-scripting-api/http');
const SLACK_BOT_TOKEN = 'PUT_YOUT_BOT_TOKEN';
const SLACK_API = 'https://slack.com/api/';

exports.rule = entities.Issue.onChange({
  title: 'Send notification to slack when an issue is reported Assignee change',
  guard: (ctx) => {
    return ctx.issue.becomesReported ||
      (ctx.issue.isReported && (ctx.issue.fields.isChanged(ctx.State) || ctx.issue.fields.isChanged(ctx.Assignee)));
  },
  action: (ctx) => {
    const issue = ctx.issue;
    var isNew = issue.becomesReported;
	var changedByName =  isNew ? issue.reporter.fullName : issue.updatedBy.fullName;
    
    var issueLink = '<' + issue.url + "|" + issue.id + '>';
    var state = issue.fields.State && issue.fields.State.name;
    if (!isNew && issue.fields.isChanged(ctx.State) && issue.oldValue(ctx.State)) {
      state = issue.oldValue(ctx.State).name + " :arrow_right: " + state;
    }
    var pretext;
    
    if (isNew) {
      pretext = "Created";
    } else if (issue.fields.isChanged(ctx.State)) {
      pretext = "State changed to " + issue.fields.State.name;
    }
    if (issue.fields.isChanged(ctx.Assignee)) {
      if (pretext) {
        pretext += "\n";
      }
      pretext = "Assignee changed to " + issue.fields.Assignee.fullName;
    }
    
    var blocks = [{
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": ":fire:"+pretext,
        "emoji": true
      }
    },{
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": issue.summary + " [" + issueLink + "]"
        }
      },
      {
        "type": "section",
        "fields": [{
            "type": "mrkdwn",
            "text": "*State:*\n" + state
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
            "text": "*Updated by:*\n" + changedByName
          }
        ]
      }
    ];

    const userEmail = issue.fields.Assignee.email;
    //Find user in slack
    var connection = new http.Connection(SLACK_API, null, 2000);
    var userResponse = connection.postSync('users.lookupByEmail', [{
      name: 'token',
      value: SLACK_BOT_TOKEN
    }, {
      name: 'email',
      value: userEmail
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
          'blocks': blocks,
          'text': pretext+" in YouTrack [" + issueLink + "]",
          'pretty': '1'
        }));
      }
    }


  },
  requirements: {
    Assignee: {
      type: entities.User.fieldType
    },
    State: {
      type: entities.State.fieldType
    }
  }
});

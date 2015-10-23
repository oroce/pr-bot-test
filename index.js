import config from './config';
import Github from 'github';
import debugFactory from 'debug';
// no promise support in github :(
import series from 'run-series';
const debug = debugFactory('pull-request-bot');
const user = 'oroce';
const repo = 'pr-bot-test';

const github = new Github({
  version: '3.0.0',
  headers: {
    'User-Agent': 'oroce\'s pr bot app'
  },
  //debug: true,
});

github.authenticate({
  token: config.token,
  type: 'oauth'
});

//const repo = github.getRepo('oroce', '');
debug('starting up with %s/%s', user, repo);
//addLabels();
//addLabelToPr(2, 'Review Needed');

series([
  addLabels,
  updateReadme
]);
function addLabels(cb) {
  let fns = [{
    name: 'Review Needed',
    color: 'fbca04'
  }, {
    name: 'lgtm',
    color: '009800'
  }].map(function(obj) {
    return function(cb) {
      addLabel(obj.name, obj.color, function(err) {
        if (!err) {
          return cb();
        }
        var msg = JSON.parse(err.message);
        if (msg.errors && msg.errors.length === 1 && msg.errors[0].code === 'already_exists') {
          return cb();
        }

        //console.log(JSON.stringify(err));
        cb(err);
      });
    };
  });
  series(fns, cb);
}

function addLabel(name, color, cb) {
  github.issues.createLabel({
    user,
    repo,
    name,
    color
  }, cb);
}

function addLabelToPr(number, label, cb) {
  github.issues.addLabels({
    user,
    repo,
    number,
    data: JSON.stringify([label])
  }, cb)
}

function updateReadme() {
  github.repos.getReadme({
    user: user,
    repo: repo
  }, function(err, result) {
    if (err) {
      if (err.code === 404) {
        return createNewReadme();
      }
      return console.error(err);
    }
    console.log(err, result);
  });
}
function createNewReadme() {
  debug('creating new readme');
  github.gitdata.getReference({
    user: user,
    repo: repo,
    ref: 'heads/master'
  }, function(err, result) {
    if (err) {
      return console.error(err);
    }

    const sha = result.object.sha;
    const branch = 'bot-badge';
    debug('creating new branch %s based on %s', branch, sha);

    github.gitdata.createReference({
      user: user,
      repo: repo,
      ref: 'refs/heads/' + branch,
      sha: sha
    }, function(err, result) {
      if (err) {
        return console.error(err);
      }

      const path = 'README.md';
      const badge = '[![Build Status](https://travis-ci.org/oroce/pr-bot-test.svg)](https://travis-ci.org/oroce/pr-bot-test)';
      const content = `
${repo}
===

${badge}`;

      debug('creating %s in %s', path, branch);
      github.repos.createFile({
        branch,
        user,
        repo,
        path,
        content: new Buffer(content).toString('base64'),
        message: 'README.md created',
        committer: {
          name: 'Pull Request bot',
          email: 'prbot@oroszi.net'
        }
      }, function(err, result) {
        if (err) {
          return console.error(err);
        }
        //console.log('createFile', result);
        github.pullRequests.create({
          user,
          repo,
          title: 'Added Status Badge',
          base: 'master',
          head: branch,
          body: `
Thanks for being awesome and you review my pull request.

I just added a status badge to your README.`,
        }, function(err, result) {
          if (err) {
            return console.error(err);
          }
          //console.log('pr create', result);

          addLabelToPr(result.number, 'Review Needed', function(err) {
            if (err) {
              return console.error(err);
            }
            console.log('Pr is available at: %s', result.html_url);
          });
        });
      });
    });
  });
}

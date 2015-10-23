import config from './config';
import Github from 'github';
import debugFactory from 'debug';
const debug = debugFactory('pull-request-bot');
const user = 'oroce';
const repo = 'pr-bot-test';

const github = new Github({
  version: '3.0.0',
  headers: {
    'User-Agent': 'oroce\'s pr bot app'
  },
  debug: true,
});

github.authenticate({
  token: config.token,
  type: 'oauth'
});

//const repo = github.getRepo('oroce', '');
debug('starting up with %s/%s', user, repo);
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

    console.log(result);
  });
}

# redsess

Yet another redis session thing for node.

This is built on top of [jed/cookies](https://github.com/jed/cookies).
You can optionally pass in a KeyGrip instance, or an array of keys to
use to sign cookies.

## Example

```javascript
var RedSess = require('redsess')
, http = require('http')
, Cookies = require('cookies')
, Keygrip = require('keygrip')
, keys = new Keygrip(['some secret keys here'])

// Create a client with the options that you'd pass to node_redis
RedSess.createClient(redisOptions)

http.createServer(function (req, res) {
  var session = new RedSess(req, res, {
    keys: keys, // if keys are provided, they'll be used
    cookieName: 's',
    expire: expirationInSeconds, // default = 2 weeks
    client: redisClient, // defaults to RedSess.client
    keys: [ "this is a string key" ], // will be made into a keygrip obj
    keys: new KeyGrip(keys), // this way also works
  })

  // you can decorate like this if you chose
  req.session = session
  res.session = session

  // .. and then some time later ..
  req.session.get('auth', function (er, auth) {
    if (!auth) {
      // redirect to login page
    } else {
      // do authorized login things
    }
  })

  // .. on the login page, if there's a post ..
  validateLogin(postedData, function (er, isValid) {
    if (isValid)
      req.session.set('auth', postedData)
  })

  // .. on the logout page ..
  req.session.del('auth', function (er) {
    // user is now logged out
  })
}).listen(1337)
```

## Constructor Options

* `expire` {Number} Time in seconds that sessions last Default=2 weeks
* `cookieName` {String} Cookie name to use for session id's. Default = 's'
* `keys` A [Keygrip](https://github.com/jed/keygrip) instance to use
  to sign the session token cookie.  (If an array is passed in, then
  RedSess will make a KeyGrip obj out of it.)
* `client` If you have another redis client you'd like to use, then
  you can do so.
* `cookies` If you already have a Cookies object, you may pass that
  in.  If not specified, then it'll make a new one for you.
* `cookieOptions` an object that extends the options object that is passed to
  `cookies.set` and `cookies.get`

## Methods

Callbacks are all the standard `cb(er, result)` style.

Deep objects are supported, but cycles in data objects will cause
terrible explosively bad awful undefined behavior, so DON'T DO THAT.

* RedSess.createClient(opts)

Calls `redis.createClient` with the supplied options.  See
[node_redis](https://github.com/mranney/node_redis) for more details.
(opts.host and opts.port are passed to redis.createClient as positional
arguments, not on the configuration object.)

If there's an `opts.auth` member, then it will use that string as a
password to redis.

* session.set(k, v, cb)

Sets a key on the session.

* session.set(object, cb)

Sets a hash of keys and values on the session.

* session.get(k, cb)

Fetches the key from the session.

* session.get(cb)

Fetches all keys from the session.  If there is no data in the
session, then it'll return `null`.

* session.del(k, cb)

Deletes a key from the session.

* session.del(cb)

Deletes the entire session.

# redsess

Yet another redis session thing for node.

This is built with [jed/cookies](https://github.com/jed/cookies) in
mind, but as long as you stick any similar getter/setter on the request
and response objects, then it'll work.

## Example

```javascript
var RedSess = require('redsess')
, http = require('http')
, Cookies = require('cookies')
, Keygrip = require('keygrip')
, keys = new Keygrip(['some secret keys here'])

RedSess.createClient(redisOptions)

http.createServer(function (req, res) {
  req.cookies = res.cookies = new Cookies(req, res, keys)
  req.session = res.session = new RedSess(req, res, options)

  // .. some time later ..
  req.session.get('auth', function (er, auth) {
    if (!auth) {
      // redirect to login page
    } else {
      // do authorized login things
    }
  })

  // .. on the login page, if there's a post ..
  validateLogin(postedData, function (er, isValid) {
    if (isValid) req.session.set('auth', postedData)
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

Fetches all keys from the session.

* session.del(k, cb)

Deletes a key from the session.

* session.del(cb)

Deletes the entire session.

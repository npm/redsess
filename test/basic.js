var http = require('http')
, RedSess = require('../')
, tap = require('tap')
, Cookies = require('cookies')
, PORT = process.env.PORT || 1337
, redisPort = 9990
, redisAuth = 'testy-testing-authy-authing'
, obj = {key:'val', obj:{foo:'bar'}}
, str = 'val'
, request = require('request')
, server
, jar = request.jar()
, spawn = require('child_process').spawn
, rcp
, path = require('path')
, conf = path.resolve(__dirname, 'redis.conf')
, quitting = false

tap.test('redis setup', function (t) {
  rcp = spawn('redis-server', [conf])
  rcp.on('exit', function (c) {
    if (!quitting) throw new Error('redis-server crashed')
  })
  rcp.stderr.pipe(process.stderr)
  rcp.stdout.pipe(process.stdout)
  t.ok(rcp, 'redis child proc')
  rcp.stdout.once('data', t.end.bind(t))
})


tap.test('setup', function (t) {
  RedSess.createClient({ port: redisPort, auth: redisAuth })
  server = http.createServer(function (req, res) {
    console.error('SERVER', req.url)
    req.cookies = res.cookies = new Cookies(req, res)
    req.session = res.session = new RedSess(req, res)
    var session = new RedSess(req, res, {
      cookieOptions: {
        path: "/cookie"
      }
    })

    res.send = function (n) {
      res.writeHead(200)
      res.end(n)
    }

    switch (req.url) {
      case '/set/str':
        return res.session.set('str', str, function (er) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, str: str }))
        })

      case '/set/obj':
        return res.session.set('obj', obj, function (er) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, obj: obj }))
        })

      case '/get/str':
        return res.session.get('str', function (er, str) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, str: str }))
        })

      case '/get/obj':
        return res.session.get('obj', function (er, obj) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, obj: obj }))
        })

      case '/get/all':
        return res.session.get(function (er, data) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, data: data }))
        })

      case '/del/str':
        return res.session.del('str', function (er, str) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, str: str }))
        })

      case '/del/obj':
        return res.session.del('obj', function (er, obj) {
          if (er) throw er
          res.send(JSON.stringify(
            { id: res.session.id, ok: true, obj: obj }))
        })

      case '/del/all':
        return res.session.del(function (er, data) {
          if (er) throw er
          res.send(JSON.stringify(
            {id: res.session.id, ok: true, data: data }))
        })

      case '/destroy':
        return res.session.destroy(function (er, data) {
          if (er) throw er;
          res.send(JSON.stringify(
            { ok: true, destroyed: true }))
        })

      case '/cookie':
        return session.set('str', 'str', function (er) {
          if (er) throw er
          res.send()
        })

      default:
        res.writeHead(404)
        res.end(JSON.stringify(
          {error: 'not found', id: res.session.id }))
    }
  })
  server.listen(PORT, function () {
    t.pass('setup done')
    t.end()
  })
})

function req (url, cb) {
  request({ url: 'http://localhost:' + PORT + url
          , jar: jar
          , json: true }, cb)
}


var sessionId

// just some random request to establish the session.
tap.test('establish session', function (t) {
  req('/404', function (er, res, data) {
    t.equal(res.statusCode, 404)
    t.has(data, { error: 'not found' })

    // from here on out, the id should always match.
    t.ok(data.id, 'has id')
    id = data.id

    var c = jar.cookies[0]
    t.ok(c)
    t.equal(c.name, 's', 'cookie name')
    t.like(c.value, /^.{40}$/, 'cookie value')
    t.ok(c.httpOnly)
    t.type(c.expires, Date)
    t.ok(c.expires.getTime() > Date.now() + 60*1000)

    sessionId = c.value

    t.end()
  })
})

tap.test('/set/str', function (t) {
  req('/set/str', function (er, res, data) {
    if (er) throw er
    t.deepEqual(data, { id: id, ok: true, str: str })
    t.equal(res.statusCode, 200)
    t.end()
  })
})

tap.test('/set/obj', function (t) {
  req('/set/obj', function (er, res, data) {
    if (er) throw er
    t.deepEqual(data, { id: id, ok: true, obj: obj })
    t.equal(res.statusCode, 200)

    var c = jar.cookies[0]
    t.ok(c)
    t.equal(c.name, 's', 'cookie name')
    t.equal(c.value, sessionId, 'cookie value')
    t.ok(c.httpOnly)
    t.type(c.expires, Date)
    t.ok(c.expires.getTime() > Date.now() + 60*1000)

    t.end()
  })
})

tap.test('/get/str', function (t) {
  req('/get/str', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual(data, { id: id, ok: true, str: str })
    t.end()
  })
})

tap.test('/get/obj', function (t) {
  req('/get/obj', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual(data, { id: id, ok: true, obj: obj })
    t.end()
  })
})

tap.test('/get/all', function (t) {
  req('/get/all', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual( data
               , { id: id
                 , ok: true
                 , data: { str: str, obj: obj }})
    t.end()
  })
})

tap.test('/del/str', function (t) {
  req('/del/str', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual(data, { id: id, ok: true })
    req('/get/str', function (er, res, data) {
      if (er) throw er
      t.equal(res.statusCode, 200)
      t.deepEqual(data, { id: id, ok: true, str: null })
      t.end()
    })
  })
})

tap.test('/del/obj', function (t) {
  req('/del/obj', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual(data, { id: id, ok: true })
    req('/get/obj', function (er, res, data) {
      if (er) throw er
      t.equal(res.statusCode, 200)
      t.deepEqual(data, { id: id, ok: true, obj: null })
      t.end()
    })
  })
})

// now set them both again, and then /del/all
tap.test('/set/obj again', function (t) {
  req('/set/obj', function (er, res, data) {
    if (er) throw er
    t.deepEqual(data, { id: id, ok: true, obj: obj })
    t.equal(res.statusCode, 200)
    t.end()
  })
})

tap.test('/set/str again', function (t) {
  req('/set/str', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual(data, { id: id, ok: true, str: str })
    t.end()
  })
})

tap.test('/del/all', function (t) {
  req('/del/all', function (er, res, data) {
    if (er) throw er
    t.equal(res.statusCode, 200)
    t.deepEqual(data, { id: id, ok: true, data: 1 })
    req('/get/all', function (er, res, data) {
      if (er) throw er
      t.equal(res.statusCode, 200)
      t.deepEqual(data, { id: id, ok: true, data: null })

      // note that deleting all the *data* doesn't change the session.
      var c = jar.cookies[0]
      t.ok(c)
      t.equal(c.name, 's', 'cookie name')
      t.equal(c.value, sessionId, 'cookie value')
      t.ok(c.httpOnly)
      t.type(c.expires, Date)
      t.ok(c.expires.getTime() > Date.now() + 60*1000)

      t.end()
    })
  })
})

// now delete our session and start over
tap.test('/destroy', function (t) {
  req('/destroy', function (er, res, data) {
    var c = jar.cookies[1]
    t.ok(c)
    t.equal(c.name, 's', 'cookie name')
    t.equal(c.path, '/', 'cookie path')
    t.equal(c.value, '', 'destroyed cookie value')
    t.ok(c.httpOnly)
    t.type(c.expires, Date)
    t.equal(c.expires.getTime(), 0)

    t.end()
  })
})

// now re-establish the session
tap.test('re-establish session', function (t) {
  req('/404', function (er, res, data) {
    t.equal(res.statusCode, 404)
    t.has(data, { error: 'not found' })

    // from here on out, the id should always match.
    t.ok(data.id, 'has id')
    id = data.id

    var c = jar.cookies[0]
    t.ok(c)
    t.equal(c.name, 's', 'cookie name')
    t.like(c.value, /^.{40}$/, 'cookie value')
    t.ok(c.httpOnly)
    t.type(c.expires, Date)
    t.ok(c.expires.getTime() > Date.now() + 60*1000)

    t.end()
  })
})


tap.test('/cookie', function (t) {
  req('/cookie', function (er, res, data) {
    var cookie = res.headers['set-cookie'][1]

    t.ok(cookie.indexOf("/cookie") > -1)

    t.end()
  })
})

tap.test('teardown', function (t) {
  t.plan(3)
  RedSess.close(function () {
    t.pass("redis shutdown")
  })
  server.close(function () {
    t.pass('http shutdown')
  })
  quitting = true
  rcp.on('exit', function () {
    t.pass('redis quit')
  })
  rcp.kill('SIGQUIT')
})

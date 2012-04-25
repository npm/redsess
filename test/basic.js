var http = require('http')
, RedSess = require('../')
, tap = require('tap')
, Cookies = require('cookies')
, PORT = process.env.PORT || 1337
, obj = {key:'val', obj:{foo:'bar'}}
, str = 'val'
, request = require('request')
, server
, jar = request.jar()

tap.test('setup', function (t) {
  RedSess.createClient()
  server = http.createServer(function (req, res) {
    console.error('SERVER', req.url)
    req.cookies = res.cookies = new Cookies(req, res)
    req.session = res.session = new RedSess(req, res)

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
            {id: res.session.id, ok: true, data: data }))
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
          , json: true }, cb)
}

// just some random request to establish the session.
tap.test('establish session', function (t) {
  req('/404', function (er, res, data) {
    t.equal(res.statusCode, 404)
    t.has(data, { error: 'not found' })

    // from here on out, the id should always match.
    t.ok(data.id, 'has id')
    id = data.id

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
      t.deepEqual(data, { id: id, ok: true, data: {} })
      t.end()
    })
  })
})

tap.test('teardown', function (t) {
  t.plan(2)
  RedSess.close(function () {
    t.pass("redis shutdown")
  })
  server.close(function () {
    t.pass('http shutdown')
  })
})

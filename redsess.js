module.exports = RedSess

var redis = require("redis")
, client = null

function RedSess (req, res, opt) {
  if (!client) {
    console.error('RedSess: no client yet', req.url, req.headers)
    res.statusCode = 503
    res.setHeader('content-type', 'text/plain')
    res.setHeader('retry-after', '10')
    res.end('Redis client not yet loaded.\n')
    return
  }

  // set the s-cookie
  var s = sessionToken(req, res, opt)
  if (s === false) {
    throw new Error('could not load session token')
  }

  this.id = "session:" + s
  this.client = client
  this.request = req
  this.response = res

  // 2 week sessions by default.
  this.expire = opt && opt.expire || 60 * 60 * 24 * 14
}

RedSess.createClient = function (conf) {
  conf = conf || {}
  client = redis.createClient(conf.port, conf.host, conf)
  if (conf.auth) client.auth(conf.auth)
}

RedSess.quit = RedSess.close = RedSess.end = function (cb) {
  if (!client) return cb && cb()
  if (cb) client.once("end", cb)
  client.quit()
}

RedSess.destroy = function () {
  client.end()
}




RedSess.prototype.del = function (k, cb) {
  if (typeof k === 'function' || !k && !cb) {
    return this.delAll(k || cb)
  }
  // actually, delete all keys starting with k:* as well
  this.client.hkeys(this.id, function (er, keys) {
    if (er) return cb && cb(er)
    var keys = keys.filter(function (key) {
      return key.split(/:/)[0] === k
    })
    if (!keys.length) return cb && cb()

    keys.unshift(this.id)
    this.client.hdel(keys, function (er) {
      this.client.expire(this.id, this.expire)
      if (cb) return cb(er)
    }.bind(this))
  }.bind(this))
}

RedSess.prototype.delAll = function (cb) {
  this.client.del(this.id, cb || function(){})
}

RedSess.prototype.set = function (k, v, cb) {
  var kv = {}
  if (typeof v === 'function') cb = v, v = null
  if (v) {
    kv[k] = v
  } else {
    kv = k
  }

  kv = flatten(kv)
  this.client.hmset(this.id, kv, function (er) {
    this.client.expire(this.id, this.expire)
    if (cb) return cb(er)
  }.bind(this))
}

RedSess.prototype.get = function (k, cb) {
  if (typeof k === 'function' || !k) {
    return this.getAll(k || cb)
  }

  if (!cb) return this.client.expire(this.id, this.expire)

  this.getAll(function (er, all) {
    if (er) return cb(er)
    all = all[k] || null
    return cb(null, all)
  }.bind(this))
}

RedSess.prototype.getAll = function (cb) {
  if (!cb) return this.client.expire(this.id, this.expire)

  this.client.hgetall(this.id, function (er, data) {
    this.client.expire(this.id, this.expire)
    if (er) return cb(er)
    return cb(er, unflatten(data))
  }.bind(this))
}

function flatten (obj, into, prefix) {
  if (!obj) return obj
  into = into || {}
  prefix = prefix || ''
  if (prefix) prefix += ':'
  Object.keys(obj).forEach(function (k) {
    if (obj[k] && typeof obj[k] === "object") {
      flatten(obj[k], into, prefix + k)
    } else into[prefix + k] = obj[k]
  })
  return into
}

function unflatten (obj) {
  if (!obj || typeof obj !== "object") return obj
  var into = {}
  Object.keys(obj).forEach(function (k) {
    // actually an object
    var m = k.split(/:/)
    , tail = m.pop()
    , p = into

    m.forEach(function (n) {
      if (!p[n] || typeof p[n] !== "object") p[n] = {}
      p = p[n]
    })
    p[tail] = obj[k]

  })
  return into
}

function sessionToken (req, res, opt) {
  if (!req.cookies) {
    res.statusCode = 500
    res.setHeader('content-type', 'text/plain')
    res.end('RedSess requires a cookies implementation')
    return false
  }

  var s = req.cookies.get( opt && opt.cookieName || 's'
                         , { signed: !!req.cookies.keys })
  if (s) {
    return req.sessionToken = res.sessionToken = s
  }
  s = require('crypto').randomBytes(30).toString('base64')
  res.cookies.set( opt && opt.cookieName || 's'
                 , s
                 , { signed: !!res.cookies.keys })

  return req.sessionToken = res.sessionToken = s
}

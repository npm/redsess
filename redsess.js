module.exports = redSess

var redis = require("redis")
var genericSession = require("generic-session")

redSess.client = null

function redSess (req, res, opt) {
  opt = opt || {}
  if (!redSess.client && !opt.client) {
    console.error('RedSess: no client yet', req.url, req.headers)
    res.statusCode = 503
    res.setHeader('content-type', 'text/plain')
    res.setHeader('retry-after', '10')
    res.end('Redis client not yet loaded.\n')
    return
  }

  if (!redSess.store)
    redSess.store = new RedStore(opt.client || redSess.client)

  return genericSession(req, res, redSess.store, opt)
}

redSess.createClient = function (conf) {
  conf = conf || {}
  redSess.client = redis.createClient(conf.port, conf.host, conf)
  if (conf.auth)
    redSess.client.auth(conf.auth)
  return redSess.client
}

redSess.quit = redSess.close = redSess.end = function (cb) {
  if (!redSess.client)
    return cb && cb()
  if (cb)
    redSess.client.once("end", cb)
  redSess.client.quit()
}

redSess.destroy = function () {
  redSess.client.end()
}

function RedStore (client) {
  this.client = client || redSess.client
}

RedStore.prototype.del = function (id, k, expire, cb) {
  // actually, delete all keys starting with k:* as well
  this.client.hkeys(id, function (er, keys) {
    if (er)
      return cb(er)

    var keys = keys.filter(function (key) {
      return key.split(/:/)[0] === k
    })

    if (!keys.length)
      return cb()

    keys.unshift(id)
    this.client.hdel(keys, function (er) {
      this.client.expire(id, expire)
      cb(er)
    }.bind(this))
  }.bind(this))
}

RedStore.prototype.delAll = function (id, cb) {
  this.client.del(id, cb)
}

RedStore.prototype.set = function (id, k, v, expire, cb) {
  var kv = {}

  if (v)
    kv[k] = v
  else
    kv = k

  kv = flatten(kv)
  this.client.hmset(id, kv, function (er) {
    this.client.expire(id, expire)
    cb(er)
  }.bind(this))
}

RedStore.prototype.get = function (id, k, expire, cb) {
  this.getAll(id, expire, function (er, all) {
    if (er || !all)
      return cb(er, null)
    cb(null, all.hasOwnProperty(k) ? all[k] : null)
  }.bind(this))
}

RedStore.prototype.getAll = function (id, expire, cb) {
  this.client.hgetall(id, function (er, data) {
    this.client.expire(id, expire)
    if (!er)
      data = unflatten(data)
    cb(er, data)
  }.bind(this))
}

RedStore.prototype.expire = function (id, expire) {
  this.client.expire(id, expire)
}

function flatten (obj, into, prefix) {
  if (!obj) return obj
  into = into || {}
  prefix = prefix || ''
  if (prefix) prefix += ':'
  Object.keys(obj).forEach(function (k) {
    if (obj[k] && typeof obj[k] === "object") {
      flatten(obj[k], into, prefix + k)
    } else into[prefix + k] = '' + obj[k]
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

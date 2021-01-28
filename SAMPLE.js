#!/usr/bin/env node
const NODE = '/usr/bin/node'
const SIGNDIR = '/home/beet/repo/campushpere-auth-simplified/index.js'
const MAILDIR = '/home/beet/repo/outlook-simple-config/sendMail'

const { spawnSync } = require('child_process')
const { relative } = require('path')

const sendMail = require(relative('/home/beet/bin', MAILDIR))

;(() => {
  const sign = spawnSync(NODE, [SIGNDIR], {
    encoding: 'utf-8',
  })
  const message = sign.stdout || sign.error
  // sendMail('☘️ Sign in result ☘️', message.replace(/\n/g, '<br>'))
})()

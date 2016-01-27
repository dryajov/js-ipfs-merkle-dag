var uniqueBy = require('unique-by')
var deasync = require('deasync')

var Traversal = function (node, opts) {
  if (!node) {
    throw new Error('Invalid  Root Node')
  }
  var visited = []
  var waiting = [{value: node, depth: 0}]
  var current
  var order = opts.order || 'DFS'
  var skipDuplicates = opts.skipDuplicates || true
  var operation = opts.operation || null
  var action = opts.action || 'Pre'
  var dagService = opts.dagService
  var getLinkNodes = function () {
    var nodes = []
    if (current) {
      for (var i = 0; i < current.links.length; i++) {
        var link = current.links[i]
        if (link.node) {
          nodes.push({ value: link.node, depth: (current.depth + 1) })
        } else {
          if (dagService) {
            var done = false
            dagService.get(link.hash().toString('hex'), function (err, node) {
              if (err) {
                done = true
                throw new Error(err)
              }
              link.node = node
              nodes.push({ value: link.node, depth: (current.depth + 1) })
              done = true
            })
            deasync.loopWhile(function () {return !done } )
          } else {
            throw new Error('Invalid DAG Service - Node missing from link')
          }
        }
      }
    }
    return nodes
  }
  var operatePost = function () {
    if (current.depth === 0) {
      return
    } else {
      var parentDepth = current.depth - 1
      for (var i = visited.length-1; i >= 0 ; i--) {
        var visit = visited[i]
        if (visit.depth === parentDepth) {
          operation(visit)
          return
        }
      }
    }
  }
  var visit = function(){
    if(order === 'DFS'){
      waiting= waiting.concat(getLinkNodes())
      if(skipDuplicates) {
        waiting = uniqueBy(waiting, function (obj) { return obj.value.key().toString('hex')})
      }

      if(operation && action == 'Post' && waiting[0] && current.depth > waiting[0].depth){
        operatePost()
      }

      visited.push(current)
      current= waiting.shift()
      if(operation && action == 'Pre'){
          operation(current)
      }

    }
    if(order === 'BFS'){
      waiting= getLinkNodes().concat(waiting)
      if(skipDuplicates) {
        waiting = uniqueBy(waiting, function (obj) { return obj.key().toString('hex')})
      }
      visited.push(current)
      current= waiting.shift()
    }
  }
  this.next= function(){
    visit()
    if(current && current.node) {
      current.done = (waiting.length > 0)
      return current
    }else{
      return {value: null, done: true}
    }
  }
  this.currentDepth= function(){
    if(current) {
     return current.depth
    }else{
     return 0
    }
  }

}
module.exports= Traversal
exports['patch uri'] = function(args) {
    var arr = [];
    var times = args.params.times || 3;
    for(var i = 0; i < times; i++) {
        arr.push(args.uri);
    }
    return arr;
}

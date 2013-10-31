/**
 * fork from https://github.com/bigodines/nodejs-heartbeat
 */
var net = require("net")
    , fs = require('fs');

exports.client = function (host, port, serviceFile) {
    var pulse, connect, socket;

    pulse = function (socket) {
        var serverinfo = fs.readFileSync(serviceFile, 'utf8');
        console.log('pulse:%s', serverinfo);
        socket.write(serverinfo, "utf8");
    };

    connect = function (net_interface) {
        socket = net_interface.createConnection(port, host);
        socket.on("data", function (data) {
            console.log('get from server,%s', data);
        });
        socket.on("error", function (x) {
            console.log("cant connect. try again");
            setTimeout(function () {
                connect(net);
            }, 3 * 1000);
        });
        socket.on("data", function () {
            pulse(socket);
        });
        socket.on('end', function () {
            console.log('socket end');
            setTimeout(function () {
                connect(net);
            }, 3 * 1000);
        });
        pulse(socket);
    };
    connect(net);

    return {
        'pulse': pulse,
        'connect': connect
    };
}; // client

exports.server = function (host, port/*, net*/) {
    var net_interface = net, clients = [], zombies = [];
    var find_zombies, start_server, ask_many, broadcast;
    // detect dead machines
    find_zombies = function (period, zombie_callback) {
        var zombies = [], limit = new Date().getTime() - period;
        if (period === undefined || period === null) {
            period = 60 * 1000; // default is 60 seconds of tolerance between pulses
        }
        for (idx in clients) {
            var last_seen = clients[idx];
            if (last_seen.hbtime < limit) {
                zombie_callback(last_seen);
                zombies.push(last_seen);
                delete clients[idx];
            }
        }
        return zombies;
    };

    start_server = function () {
        net_interface.createServer(function (socket) {
            var got_data = function (data) {
                var pulse = JSON.parse(data);
                console.log('get from client,%s,%s', socket.remoteAddress, JSON.stringify(pulse));
                clients[pulse.id] = {
                    'id': pulse.id,
                    'addr': socket.remoteAddress,
                    'hbtime': new Date().getTime(),
                    'socket': socket
                };
            };
            socket.setEncoding("utf8");
            socket.on("data", got_data);
        }).listen(port, host);
    };

    /*send heartbeat message to many clients*/
    ask_many = function (clients) {
        var c;
        for (var idx in clients) {
            c = clients[idx];
            try {
                c.socket.write("are u alive");
            } catch (x) {
                console.log("couldnt send message to: " + c.id + " waiting for it to die");
            }
        }
    };

    /*broadcast heartbeat message*/
    broadcast = function () {
        ask_many(clients);
    };

    if (arguments[2] !== undefined) {
        net_interface = arguments[2];
    }

    if (host === undefined) {
        host = "127.0.0.1";
    }

    if (port === undefined) {
        port = 6688;
    }

    start_server();

    return {
        'find_zombies': find_zombies,
        'ask_many': ask_many,
        'broadcast': broadcast,
        'clients': clients,
        'zombies': zombies
    };
}; // server
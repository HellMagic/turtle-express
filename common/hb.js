/**
 * fork from https://github.com/bigodines/nodejs-heartbeat
 */
var net = require("net")
    , fs = require('fs');

exports.client = function (host, port, getServiceInfo) {
    var pulse, connect, socket;

    if (!getServiceInfo) {
        throw "no service provider";
    }

    pulse = function (socket) {
        var serverinfo = getServiceInfo();
        socket.write(serverinfo, "utf8");
        socket.write('\n', "utf8");
    };

    connect = function (net_interface) {
        socket = net_interface.createConnection(port, host);
        socket.on("error", function (x) {
            console.log("cant connect. try again, %s:%s", host, port);
            setTimeout(function () {
                connect(net);
            }, 60 * 1000);
        });
        socket.on("data", function (data) {
            console.log('get from server,%s', data);
            pulse(socket);
        });
        socket.on('end', function () {
            console.log('socket end');
            setTimeout(function () {
                connect(net);
            }, 60 * 1000);
        });
        pulse(socket);
    };
    connect(net);

    return {
        pulse: pulse,
        connect: connect
    };
}; // client

exports.server = function (host, port/*, net*/) {
    var net_interface = net
        , clients = {}
        , zombies = []
        , find_zombies
        , start_server
        , ask_many
        , broadcast
        , getClients;
    // detect dead machines
    find_zombies = function (period, zombie_callback) {
        var zombies = [], limit = new Date().getTime() - period;
        if (period === undefined || period === null) {
            period = 60 * 1000; // default is 60 seconds of tolerance between pulses
        }
        var c;
        for (var id in clients) {
            c = clients[id];
            if (c.hbtime < limit) {
                zombie_callback(c);
                zombies.push(c);
                delete clients[id];
            }
        }
        return zombies;
    };

    start_server = function () {
        net_interface.createServer(function (socket) {
            var id
                , buf = ""
                , split = 0;
            var got_data = function (data) {
                var msg;
                buf += data.toString();
                split = buf.indexOf('\n');
                while (split > -1) {
                    try {
                        var message = buf.substring(0, split);
                        msg = JSON.parse(message);
                        id = msg.id;
                        if (!id) {
                            console.log('invalid node,no id in pulse');
                            return;
                        }
                        var newClient = {
                            'id': id,
                            'addr': socket.remoteAddress,
                            'hbtime': new Date().getTime(),
                            'socket': socket
                        };
                        clients[msg.id] = newClient;
                        console.log('new client,%s,%s', newClient.id, newClient.addr);
                        buf = buf.substring(split + 1); // Cuts off the processed chunk
                        split = buf.indexOf('\n'); // Find the new delimiter
                    } catch (error) {
                        console.log('heart beat proto failed,%s', error);
                        socket.end();
                        delete clients[id];
                        buf = "";
                        split = 0;
                    }
                }
            };
            socket.setEncoding("utf8");
            socket.on("data", got_data);
            socket.on('end', function () {
                delete clients[id];
            });
        }).listen(port, host);
        console.log('heart beat listen on,%s:%s', host, port);
    };

    /*send heartbeat message to many clients*/
    ask_many = function () {
        var c;
        for (var id in clients) {
            c = clients[id];
            console.log('ask client %s,%s', c.id, c.addr);
            try {
                if (c.socket.writable) {
                    c.socket.write("show me the money");
                } else {
                    console.log('cannot send to client,%s', c.id);
                }
            } catch (x) {
                console.log("couldnt send message to: " + c.id + " waiting for it to die");
            }
        }
    };

    /*broadcast heartbeat message*/
    broadcast = function () {
        ask_many();
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
        find_zombies: find_zombies,
        ask_many: ask_many,
        broadcast: broadcast,
        clients: clients,
        zombies: zombies
    };
}; // server
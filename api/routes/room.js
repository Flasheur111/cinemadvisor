var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var config = require('../config')
var url = config.url_api;
var router = express.Router();
var async = require("async");

/* Add room */
router.get('/add/:idcinema/:roomname', function (req, res, next) {
    var id = req.params.idcinema;
    var name = req.params.roomname;

    if (id == null || name == null) {
        res.send({"error": "arguments"});
        return;
    }

    MongoClient.connect(url, function (err, db) {
        db.collection('room').find({'idcinema': id, 'roomname': name.toLowerCase()}).count(function (_, count) {
            if (count > 0) {
                db.close();
                res.send({"error": "rooms already exist"});
            }
            else {
                db.collection('room').insert({'idcinema': id, 'roomname': name})
                db.close();
                res.send({"error": "ok", "inserted": {"idcinema": id, "roomname": name}});
            }
        });
    });
});

/* Get all rooms */
router.get('/list', function (req, res, next) {
    MongoClient.connect(url, function (err, db) {
        db.collection('room').find().toArray(function (err, doc) {
            db.close();
            res.send(doc);
        });
    })
});


/* Get rooms of cinema */
router.get('/list/:idcinema', function (req, res, next) {
    var id = req.params.idcinema;

    if (id == null) {
        res.send({"error": "arguments"});
        return;
    }

    getAverageComments(id, function(full) {
        res.send(full);
    })

});

function getAverageComments(id, cb) {
    async.waterfall([
        function (callback) {
            MongoClient.connect(url, function (err, db) {
                db.collection('room').find({"idcinema": id}).toArray(function (err, document) {
                    callback(err, db, document);
                });
            });
        },
        function (db, document, callback) {
            var full = [];
            async.forEach(document, function (doc, callback2) {
                db.collection('comment').find({'idcinema': id, 'idroom': doc._id.toString()}).toArray(function (err, out) {
                    var items = [];
                    var sum = 0;
                    if (out) {
                        for (var i = 0; i < out.length; i++) {
                            if (out[i]) {
                                items.push(out[i].grade);
                                sum += out[i].grade;
                            }
                        }
                        var avg = sum / items.length;
                        doc.avg = avg ? avg : 0;
                    }
                    else
                        doc.avg = 0;

                    full.push(doc);
                    if (document[document.length - 1]._id == doc._id)
                        callback(null, db, full);
                });
            });

        }
    ], function (err, db, full) {
        db.close();
        cb(full);
    });
}

/* Drop rooms */
router.get('/drop', function (req, res, next) {
    MongoClient.connect(url, function (err, db) {
        db.collection('room').drop();
        db.close();
        res.send({"error": "ok"});
    });
})

module.exports = router;
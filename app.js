var OpmlParser = require('opmlparser')
      , parser = new OpmlParser()
      , RSSparser = require('blindparser')
      , fs = require('fs')
      , request = require('request')
      , repl = require('repl')
      , couch = require('nano')('http://localhost:5984')
      ;

var feed_store = couch.use('feeds');


function myCallback (error, meta, feeds, outline){
    if (error) {
        console.error(error) 
    } else {
        console.log('OPML info');
        console.log('%s - %s - %s', meta.title, meta.dateCreated, meta.ownerName);
        console.log('Feeds');
        feeds.forEach(function (feed){
            console.log('%s - %s (%s)', feed.title, feed.htmlurl, feed.xmlurl);
            feed_store.insert({ 
                                title:      feed.title,
                                htmlUrl:    feed.htmlurl,
                                xmlUrl:     feed.xmlurl,
                                type:       feed.type,
                                text:       feed.text
                               }, feed.title, function(err, body) {
                if (!err)
                    console.log(body);
                });
        });
    }
}

function parseFile() {
    parser.parseFile('./subscriptions.xml', myCallback);
}

function listFeeds() {
    feed_store.list(function(err, body) {
        if (!err) {
            body.rows.forEach(function(doc) {
                console.log(doc.id);
                //check that we dont' grab the design documents
                if(doc.id !== '_design/feeds') fetchFeed(doc.id);
            });
        }
    });
}

function fetchFeed(docID) {
    feed_store.get(docID, function(err, body) {
        console.log('Fetching feed for ' + docID);
        console.log('Title: ' + body.title);
        console.log('URL: ' + body.xmlUrl);
        RSSparser.parseURL(body.xmlUrl, function(err, out){
            if(err) console.log(err)
            if(out) updateFeed(docID, body, out);
        });
    });
}

function updateFeed(docID, doc, parsedFeed) {
    doc.items = parsedFeed.items;
    feed_store.insert(doc, docID, function(err, body) {
        if(err) console.log('error updated feed');
        if(body) console.log('updated feed for ' + doc.title);
    }); 
}

listFeeds();
//parseFile();
//fetchFeed('mcotton-shooting');

/*
repl.start({
    prompt: "node via stdin> ",
    input: process.stdin,
    output: process.stdout
});
*/


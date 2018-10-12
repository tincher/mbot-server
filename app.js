const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const csv = require('csvtojson');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const schedule = require('node-schedule');
const request = require('request');
const util = require('util')
const cors = require('cors')

const skucsvpath = 'C:/Users/jojoe/Desktop/projects/manne/skus.csv'
const brandscsvpath = 'C:/Users/jojoe/Desktop/projects/manne/brands.csv'
const categoriescsvpath = 'C:/Users/jojoe/Desktop/projects/manne/categories.csv'

const bigbuyurl = 'https://api.bigbuy.eu/rest/catalog/categories.json?isoCode=de'

var users = require('./users.json');


passport.use(new Strategy(
    function(username, password, cb) {
        result = false;
        let user = JSON.parse('{"username":"' + username + '","password":"' + password + '"}')

        for (var i = 0; i < user.length; i++) {
            if (element.username === username) {
                if (element.password === password) {
                    result = user;
                }
            }
        }
        return cb(null, user)
    }));


passport.serializeUser(function(user, cb) {
    cb(null, user.username);
});
passport.deserializeUser(function(id, cb) {
    users.forEach(element => {
        if (element.username === id) {
            return cb(null, element)
        }
    })
});

const app = express();
app.use(require('cookie-parser')());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(express.static('mbot-site'));
app.use(cors);

app.listen(3000, () => console.log('MBot listening on port 3000!'));



// scheduled categories fetch

// var j = schedule.scheduleJob('* * */2 * * *', function(){
// var j = schedule.scheduleJob('*/20 * * * * *', function() {
//
//     console.log('The answer to life, the universe, and everything!');
// });

//blacklists


app.post('/:type/delete',
    ensureLoggedIn('/'),
    (req, res) => {
        let csvpath = getCsvPathForType(req.params.type)
        item = req.body;
        csv({
            noheader: true
        }).fromFile(csvpath).then((jsonObj) => {
            let temp = jsonObj.filter(obj => (obj.field1 === item.field1))
            jsonObj.splice(jsonObj.indexOf(temp[0]), 1);
            const csvWriter = createCsvWriter({
                path: csvpath,
                header: ['field1']
            });
            csvWriter.writeRecords(jsonObj);
        });
        res.send('successfull')
    });


app.get('/:type/get',
    ensureLoggedIn('/'),
    (req, res) => {
        if (req.params.type !== 'category') {
            csv({
                noheader: true
            }).fromFile(getCsvPathForType(req.params.type)).then((jsonObj) => {
                console.log(jsonObj);
                res.send(jsonObj)
            })
        } else {
            var categories = [];
            var options = {
                url: bigbuyurl,
                headers: {
                    'Authorization': 'Bearer ' + 'MDBlOTQyYmUyMTc3MmMwM2U2Mzk5YWYxMjdmMWI5NDdmYjE4Y2RlYTRhODFiMDUzNWRmMDBjOTQwZmYxZjNhNw'
                }
            }
            request(options, (err, r, body) => {
                if (err) {
                    return console.log(err);
                }
                if (r.statusCode === 429) {
                    res.json('Too many requests')
                    return console.log('Too many requests')
                }
                var categories = JSON.parse(body).map((d) => {
                    return {
                        name: d.name,
                        id: d.id,
                        parent: d.parentCategory,
                        blacklisted: false,
                        children: []
                    }
                });
                categories.push({
                    name: 'root',
                    id: 2,
                    parent: -1,
                    children: [],
                    blacklisted: false
                });

                categories.forEach((category) => {
                    category.children = categories.filter(c => c.parent === category.id).map(i => i.id);

                });
                csv({
                    noheader: true
                }).fromFile(getCsvPathForType(req.params.type)).then((jsonObj) => {
                    var brandslist = jsonObj.map(brand => parseInt(brand.field1));
                    var categoriesWithBlacklisted = categories.map(curCategory => {
                        if (brandslist.includes(curCategory.id)) {
                            curCategory.blacklisted = true;
                        }
                        return curCategory;
                    });

                    console.time('test')
                    result = buildTree(2, categoriesWithBlacklisted);
                    console.timeEnd('test')
                    res.send(categoriesWithBlacklisted);
                });
            });


        }
    });

app.post('/:type/add',
    ensureLoggedIn('/'),
    (req, res) => {
        let csvpath = getCsvPathForType(req.params.type)
        const csvWriter = createCsvWriter({
            path: csvpath,
            header: ['field1'],
            append: true
        });
        csvWriter.writeRecords(req.body);
        res.send('successfull')
    });



//authentication

app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/'
    }),
    function(req, res) {
        res.redirect('/blacklists/skus.html');
    });

app.get('/logout',
    function(req, res) {
        req.logout();
        res.redirect('/');
    });


//helper functions


function buildTree(rootId, categoriesList) {
    var root = categoriesList.find(x => x.id === rootId);
    if (!root.children.length < 1) {
        root.children = categoriesList.filter(x => root.children.includes(x.id));
        root.children.forEach(a => buildTree(a.id, categoriesList));
    }
    return root;
}

function getCsvPathForType(type) {
    if (type === 'sku') {
        return skucsvpath;
    } else if (type === 'brand') {
        return brandscsvpath;
    } else if (type === 'category') {
        return categoriescsvpath;
    }
}
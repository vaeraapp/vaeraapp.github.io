const fs = require("fs")
const axios = require("axios")
const http = require('http')
const url = require("url")

const data = JSON.parse(fs.readFileSync("pods.txt","utf-8"))

const now = Date.now()

const client_id = "9db3144882ba4608879fde689814bdd5"
const client_secret = "5fd9dc13e9434cf7bc08b758165c6406"

async function gettoken() {
    const req = await axios.post("https://accounts.spotify.com/api/token",{
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    },{
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })

    console.log("generated new token")

    return req.data.access_token
}

let token

let auth_header

(async () => {

if (data[0] + 3540000 < now) {
    token = await gettoken()
    auth_header = {"Authorization": "Bearer " + token}
    const curtime = Date.now()
    fs.writeFileSync("pods.txt",JSON.stringify([curtime,token]))
    setInterval(async () => {
        token = await gettoken()
        auth_header = {"Authorization": "Bearer " + token}
        const curtime = Date.now()
        fs.writeFileSync("pods.txt",JSON.stringify([curtime,token]))
    },3540000)
} else {
    token = data[1]
    auth_header = {"Authorization": "Bearer " + token}
    setTimeout(async () => {
        token = await gettoken()
        auth_header = {"Authorization": "Bearer " + token}
        const curtime = Date.now()
        fs.writeFileSync("pods.txt",JSON.stringify([curtime,token]))
        setInterval(async () => {
            token = await gettoken()
            auth_header = {"Authorization": "Bearer " + token}
            const curtime = Date.now()
            fs.writeFileSync("pods.txt",JSON.stringify([curtime,token]))
        },3540000)
    },(data[0] + 3540000) - now)
}

console.log(token,auth_header)

})()

function fixitem(item) {
    if ("available_markets" in item) {
        delete item.available_markets
    }
    if ("href" in item) {
        delete item.href
    }
    if ("uri" in item) {
        delete item.uri
    }
    if ("external_urls" in item) {
        delete item.external_urls
    }
    if ("release_date_precision" in item) {
        delete item.release_date_precision
    }
    if ("preview_url" in item) {
        delete item.preview_url
    }
    if ("external_ids" in item) {
        delete item.external_ids
    }
    if ("is_local" in item) {
        delete item.is_local
    }
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.url.slice(0,7) === "/search") {
            const query = url.parse(req.url,true).query
            let querystr = "https://api.spotify.com/v1/search?q="
            console.log(query)
            if (query.q === undefined || !/\S/.test(query.q)) {
                res.statusCode = 400;
                res.setHeader("Content-Type","application/json")
                res.end("")
                return
            } else {
                querystr = querystr + query.q
            }
            if (query.type === undefined) {
                res.statusCode = 400;
                res.setHeader("Content-Type","application/json")
                res.end("")
                return
            } else {
                querystr = querystr + "&type=" + query.type
            }
            if (query.limit !== undefined) {
                querystr = querystr + "&limit=" + query.limit
            }
            if (query.offset !== undefined) {
                querystr = querystr + "&offset=" + query.offset
            }
            const newreq = await fetch(querystr,{
                method: "GET",
                headers: auth_header
            })

            console.log(newreq.status,newreq.data)

            if (newreq.status !== 200) {
                res.statusCode = 502;
                res.setHeader("Content-Type","application/json")
                res.end("")
                return
            }
            const json = await newreq.json()

            for (const key in json) {
                if (json.hasOwnProperty(key)) {
                    if ("href" in json[key]) {
                        delete json[key].href
                    }
                    if ("next" in json[key]) {
                        delete json[key].next
                    }
                    if ("previous" in json[key]) {
                        delete json[key].previous
                    }
                    if ("items" in json[key]) {
                        for (const key2 in json[key].items) {
                            if (json[key].items.hasOwnProperty(key2)) {
                                const item = json[key].items[key2]
                                fixitem(item)
                                if ("album" in item) {
                                    fixitem(item.album)
                                    if ("artists" in item.album) {
                                        for (const artist of item.album.artists) {
                                            fixitem(artist)
                                        }
                                    }
                                }
                                if ("artists" in item) {
                                    for (const artist of item.artists) {
                                        fixitem(artist)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            console.log(newreq)
            res.statusCode = 200
            res.setHeader("Content-Type","application/json")
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end(JSON.stringify(json))
        } else {
            res.statusCode = 404;
            res.setHeader("Content-Type","application/json")
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end("")
        }
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end('Internal Server Error')
    }
})

server.listen(6969, "0.0.0.0", () => {
    console.log("hey")
})
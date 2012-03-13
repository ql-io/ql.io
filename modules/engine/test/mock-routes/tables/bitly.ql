create table bitly.shorten
  on insert get from "http://api.bitly.com/v3/shorten?login={^login}&apiKey={^apikey}&longUrl={^longUrl}&format={format}"
            using defaults apikey = "{config.bitly.apikey}", login = "{config.bitly.login}", format = "json"
            resultset 'data.url'
  on select get from "http://api.bitly.com/v3/expand?login={^login}&apiKey={^apikey}&shortUrl={^shortUrl}&format={format}"
            using defaults apikey = "{config.bitly.apikey}", login = "{config.bitly.login}", format = "json"
            resultset 'data.expand'

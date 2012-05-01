<?xml version="1.0" encoding="utf-8"?>
<MultipartRequest xmlns="urn:ebay:apis:eBLBaseComponents">
{{#params}}
    <RequesterCredentials>
        <eBayAuthToken>TestToken</eBayAuthToken>
    </RequesterCredentials>
    {{#desc}}<desc>{{desc}}</desc>{{/desc}}
{{/params}}
</MultipartRequest>

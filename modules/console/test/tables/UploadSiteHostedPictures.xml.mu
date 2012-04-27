<?xml version="1.0" encoding="utf-8"?>
<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
{{#params}}
    <RequesterCredentials>
        <eBayAuthToken>{{eBayAuthToken}}</eBayAuthToken>
    </RequesterCredentials>
    {{#ErrorLanguage}}<ErrorLanguage>{{ErrorLanguage}}</ErrorLanguage>{{/ErrorLanguage}}
    {{#MessageID}}<MessageID>{{MessageID}}</MessageID>{{/MessageID}}
    {{#Version}}<Version>{{Version}}</Version>{{/Version}}
    {{#WarningLevel}}<WarningLevel>{{WarningLevel}}</WarningLevel>{{/WarningLevel}}
    {{#ExtensionInDays}}<ExtensionInDays>{{ExtensionInDays}}</ExtensionInDays>{{/ExtensionInDays}}
    {{#ExternalPictureURL}}<ExternalPictureURL>{{ExternalPictureURL}}</ExternalPictureURL>{{/ExternalPictureURL}}
    {{#PictureData}}<PictureData>{{PictureData}}</PictureData>{{/PictureData}}
    {{#PictureName}}<PictureName>{{PictureName}}</PictureName>{{/PictureName}}
    {{#PictureSet}}<PictureSet>{{PictureSet}}</PictureSet>{{/PictureSet}}
    {{#PictureSystemVersion}}<PictureSystemVersion>{{PictureSystemVersion}}</PictureSystemVersion>{{/PictureSystemVersion}}
    {{#PictureUploadPolicy}}<PictureUploadPolicy>{{PictureUploadPolicy}}</PictureUploadPolicy>{{/PictureUploadPolicy}}
    {{#PictureWatermark}}<PictureWatermark>{{PictureWatermark}}</PictureWatermark>{{/PictureWatermark}}
{{/params}}
</UploadSiteHostedPicturesRequest>
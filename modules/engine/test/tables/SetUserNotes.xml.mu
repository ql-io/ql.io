<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <!-- Standard Input Fields -->
  <DetailLevel>ReturnAll</DetailLevel>

  <Version>723</Version>
  <WarningLevel>High</WarningLevel>
  {{#params}}
  <ItemID>{{itemId}}</ItemID>
  {{/params}}
</GetItemRequest>
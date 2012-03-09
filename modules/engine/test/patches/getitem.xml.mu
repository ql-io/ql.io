<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <!-- Standard Input Fields -->
  <DetailLevel>ReturnAll</DetailLevel>

  {{#params}}
  <OutputSelector>{{outputselector}}</OutputSelector>
  {{/params}}

  <Version>723</Version>
  <WarningLevel>High</WarningLevel>

  <RequesterCredentials>
    <eBayAuthToken>AgAAAA**AQAAAA**aAAAAA**n5rtTQ**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6wJkYSmC5KHpAydj6x9nY+seQ**1hwBAA**AAMAAA**senUyiS57CFVkM9eryiP2l8TwnClxlLxZt6eHoN1LR4BItvEGIEGn9TAib32mQZSFQQR2xH9Gtxa2VS0ijESK8WpuCY0QPULHmlQ63+p41/3jG7GCOpqWRIIcNP/qN3lkJHYl6vzxGJZMUiAAdNWJiqJropgb/0fe565C0tiu2cMix11Qxbm6OW+X1Pi8I9M9zHF0pGs68KP7mUkTSYQN50zwOexENgsfXGx6SJXo+qYlLm/oXS3PWl3JXfpiq3WbngOcpY6D6jgHO9eaxHhfsiQK0vDxC68llWY52o19BPqMHMFZKTtO2uLf7VolbyD5VE5HOONThxmvcz9I3l0eJWDCuYA0l5ltWaHOZHDhaR0pgWdQUPpW2cE1ZbQ+gz+m6zOP96y3+kl6DREj2cg9N7xXqe4f/tfX0eCK9zqkIukd1NMfZzXtJ9kWHStIElCSTf/BmcsCRsJuPrPo9hfzJT574oVhyqieu2fB9IsV0yIZyGqP8CFYjthibyy/3+RGbev335brqW59o8pcqd4+K9ScWeygmDRd4nAZ0jPUr/oS1nh3IlP7in/tXEL6m78g9OHVh9dPSWgMa7F+y3YLvesbksafonWCxTWCnpRGxYGFHHGro/uZNVFnfrCbHwMkCALI7Awe+vZYLu2AKEtBqdaauIv1sv893zszDck7R80H5uczYgOsWiqU1BHLvZluv+Uzg48wxL1O1cdhj0OmLvC6ABCtA1BsSMB9pLOplqdTq/Rao797K9Bz59YoG95</eBayAuthToken>
  </RequesterCredentials>

  {{#params}}
  <ItemID>{{itemId}}</ItemID>
  {{/params}}
</GetItemRequest>
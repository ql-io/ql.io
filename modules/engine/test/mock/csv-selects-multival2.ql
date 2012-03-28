create table second on select get from "http://localhost:3000/csv-selects2.json"

select ViewItemURLForNaturalSearch from second where ItemID in ('400285747200','230764940403') and includeSelector = 'ShippingCosts'


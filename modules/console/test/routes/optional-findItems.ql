-- this route does not have the word 'with optional params', so requires all params to be provided.
return select itemId from finditems where keywords = '{^keyword}'
via route '/all?key={^keyword}&someother={some}' using method get
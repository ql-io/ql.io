create table ebay.trading.SetUserNotes
  on update post to "https://api.sandbox.ebay.com/ws/api.dll"
     using headers 'X-EBAY-API-COMPATIBILITY-LEVEL' = '737',
                   'X-EBAY-API-SITEID' = '0',
                   'X-EBAY-API-CALL-NAME'= 'SetUserNotes'
     using defaults RequesterCredentials.eBayAuthToken = 'AgAAAA**AQAAAA**aAAAAA**mRsvTg**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6wFk4CoAZeHowmdj6x9nY+seQ**2oQBAA**AAMAAA**4zft+pfZAUlEDvEbfasDfR4BwoxjEoWAwxvvykdZ/7il08ZLxfgiAj/bQujsZy0NteI7lKg2+MA25CY0LDfjA/YoPdhVCa0eu+BvgSLM+qigoWmA2A/81bRDs7i6pU3F2hXTGdToAkFpsTCec9G4H0LHpfu63mr9fS07rqXgaCIxG/JbiWfrv1QV6jAYrUPlQUWwL9z7+YQhy/l2bxGiW2QxlPmiWqjqZn3F+fOBUTHIeP5/BBKteHnQd7TvvMCV2vnIeckLUuXRF/hrG1kXn6v8r2FZzj4vIN0FZlDVZHHQpEVR6EhYNaeeLtSsSVp0kW0Ebt5cqKfGhW/I8L5jR3ZkyBFq03y3Z8qQ2d5chEERBg4Hf72+pZVSLmJ4T1KDtTIATfHlGBxghLiHEdlOLjhGtk4hQPaZlb+DB3eCOUJAjs7VrCYUAmofEgjLqOSmQ+7M48WmQ48a3F3BPEqpG3CpiqZcKzKkVxeu43MkzyeG+VNK7mPc+Zlgn6jJxQPTCMMw4P2fhJ6qU+cGfbsijUvqOSICWcbgEjlVKEsBWNuPLPrav9ELzQSNwYwYxsO46HqrNCC6kQx4pk1AagOTV22JpNIoSijTZecVJDin/NHqKmT92HizkuYDIHvRCoWnQIoZ1xh5qetuTkSEgnR+Kl/3mQnK4Gu5pHK4sJYBhneOe8N9Q7Q0Tam5yPyQ4uhrt9TOXtgPVXvJ5ZPBJ3TM6lZktWJq8wlViXQDFPjQhd/QcYfUH8nsoPbwBwld3E86'
     using bodyTemplate 'SetUserNotes.ejs' type 'application/xml'
     resultset 'SetUserNotesResponse'
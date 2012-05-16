return insert into multipart.test.table (desc) values ('{desc}') with parts "{req.parts[0]}", "{req.parts[1]}"
via route '/multipart/test/upload?desc={desc}' using method post;


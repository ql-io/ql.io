return insert into multipart.test.table (desc) values ('{desc}') with part "{req.parts[0]}"
via route '/multipart/test/upload?desc={desc}' using method post;


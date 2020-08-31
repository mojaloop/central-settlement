GRANT ALL PRIVILEGES ON *.* TO 'root'@'%'  IDENTIFIED WITH mysql_native_password BY 'root' WITH GRANT OPTION;
FLUSH PRIVILEGES;
ALTER USER 'central_ledger'@'%' identified WITH mysql_native_password by 'password';
FLUSH PRIVILEGES;

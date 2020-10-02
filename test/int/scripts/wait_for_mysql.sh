

is_db_up() {
  docker exec -i cs_int_mysql sh -c 'mysql -h"localhost" -P"3306" -u"central_ledger" -p"password" -e "select 1"'
}

MAX_ATTEMPT=1
set +e
echo 'waiting 20 seconds until mysql database is ready to accept connection'
until is_db_up = 0 || [ $MAX_ATTEMPT = 10 ]; do
  echo "checking connection ... attempt: $MAX_ATTEMPT"
  sleep 2
  (( MAX_ATTEMPT=MAX_ATTEMPT+1 ))
done
if [ $MAX_ATTEMPT = 10 ]
then
 echo "could not connect to database...exiting"
 exit 1
fi
echo 'finished waiting'

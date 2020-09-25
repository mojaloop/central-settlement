BRANCH='feature/OTC'
TMP_FOLDER='tmp/central-ledger'
if ! [  -d $TMP_FOLDER ]
then
 rm -rf $TMP_FOLDER
 git clone --depth 1 --single-branch --branch $BRANCH git@github.com:mojaloop/central-ledger.git $TMP_FOLDER
 mkdir -p ./migrations ./seeds
 rm -rf ./migrations/* ./seeds/*
 mv $TMP_FOLDER/migrations/* ./migrations
 mv $TMP_FOLDER/seeds/* ./seeds
fi

WORKING_DIR=$(cd $(basename .) && pwd -P)
BRANCH_NAME=$(basename $WORKING_DIR)

TEMP_DIR_NAME=".deploy"
mkdir $TEMP_DIR_NAME
cd $TEMP_DIR_NAME

git init
git remote add origin https://github.com/bennyhuo/Books.git
git fetch
git checkout $BRANCH_NAME

cp $WORKING_DIR/*.md ./

if [ $(git status --porcelain | wc -l) -eq "0" ]; then
    echo "No updates in $BRANCH_NAME."
else
    echo "Update $BRANCH_NAME ..."
    git add .
    git commit -m 'update'
    git push origin $BRANCH_NAME
fi
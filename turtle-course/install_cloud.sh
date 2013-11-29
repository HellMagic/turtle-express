echo "install app cloud,$1,`basename $1`"
scp -r $1 work@cloud.sunshine-library.org:/home/work/tmp/
curl cloud.sunshine-library.org:9460/install?folder=/home/work/tmp/`basename $1`

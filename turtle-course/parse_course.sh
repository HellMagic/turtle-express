echo "parse course,$1,$2"
curl "127.0.0.1:3000/course?chapter=$2&subject=$1"

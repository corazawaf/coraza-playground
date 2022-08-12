FROM ubuntu:latest

RUN apt -y install git

COPY entrypoint.sh /entrypoint.sh
RUN mkdir /crs
ENTRYPOINT ["/entrypoint.sh"]
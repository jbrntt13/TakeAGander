#!/bin/sh
envsubst < /config/go2rtc.template.yaml > /config/go2rtc.yaml
exec go2rtc

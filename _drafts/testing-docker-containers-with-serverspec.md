---
layout: post
title: "Testing docker containers with serverspec"
modified: 2014-09-06 20:03:56 +0200
tags: [docker, testing, serverspec, andreasschmidt, peterrossbach ]
category: Docker
links:
- Supervisor, a process control system: http://supervisord.org/
- 4 Wege in den Docker Container: https://blog.codecentric.de/2014/07/vier-wege-in-den-docker-container/
- nsenter als Container:  https://github.com/jpetazzo/nsenter
keywords:
- testing
- nsenter
- docker
- serverspec
---

We've introduced [Serverspec](serverspec.org) for hosts and vms in a number of [previous posts (in german)](http://www.infrabricks.de/tags.html),
what we need now is a link to linux containers and docker. So how can we run a serverspec specification inside a container?
We found that there is more than one way accomplish this, so let's see how.

## SSH

From the view of serverspec, using ssh is the easiest option. This way we would not
have to distinguish between a real server, a vm or a container, since all can be reached
through a running sshd, where serverspec is going to tunnel through its check commands.

Unfortunately this would cause additional work to be done on the container level,
because we would need a running sshd side by side to the container application process.
This has been solved i.e. using tools such as [supervisor.d](http://supervisord.org/), but
it is probably not suitable for a container/microservice approach.

![Serverspec über ssh ausführen]({{ site.BASE_PATH }}/assets/images/docker_serverspec_ssh.png)

**Pro/Con**: If you use containers as a replacement for virtual machines (with sshd and all),
using serverspec+ssh ist the easiest option. If you favour the container/microservice approach,
we'd need another solution.

## Testing at build time

By "build time" we're focusing a call to `docker build`. So we're able to place
serverspec related things into our Dockerfile: ADDing the specification directories and
RUNning serverspec, which in turn writes its processing output to a file. Spec directories
and result output may reside on a volume of course, so we're able to steer and inspect
things from the host side.

Example:

```bash
$ mkdir serverspec-docker-test
$ cd serverspec-docker-test
$ mkdir spec.d
$ cd spec.d
$ serverspec --init

$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 2

 + spec/
 + spec/localhost/
 + spec/localhost/httpd_spec.rb
 + spec/spec_helper.rb
 + Rakefile

$ vim Dockerfile
```

`Dockerfile` needs a serverspec installation, a spec and a call to `rake`, to
start:

```
FROM ubuntu:14.04

RUN sudo apt-get -yqq update

RUN sudo apt-get -yqq install ruby1.9.3

RUN sudo gem install rake -v '10.3.2' --no-ri --no-rdoc
RUN sudo gem install rspec -v '2.99.0' --no-ri --no-rdoc
RUN sudo gem install specinfra -v '1.21.0' --no-ri --no-rdoc
RUN sudo gem install serverspec -v '1.10.0' --no-ri --no-rdoc

ADD ./spec.d /opt/spec.d

RUN ( cd /opt/spec.d; rake spec )

CMD /bin/bash
```

Building our container (shortened):

```bash
$ docker build .
Sending build context to Docker daemon 7.168 kB
Sending build context to Docker daemon
Step 0 : FROM ubuntu:14.04
 ---> c4ff7513909d
Step 1 : RUN sudo apt-get -yqq update
 ---> Running in bc2eb91c00ff
[...]
Removing intermediate container bc2eb91c00ff
Step 2 : RUN sudo apt-get -yqq install ruby1.9.3
[...]
Step 3 : RUN sudo gem install rake -v '10.3.2' --no-ri --no-rdoc
[...]
Step 4 : RUN sudo gem install rspec -v '2.99.0' --no-ri --no-rdoc
[...]
Step 5 : RUN sudo gem install specinfra -v '1.21.0' --no-ri --no-rdoc
[...]
Step 6 : RUN sudo gem install serverspec -v '1.10.0' --no-ri --no-rdoc
[...]
Step 7 : ADD ./spec.d /opt/spec.d
[...]
Step 8 : RUN ( cd /opt/spec.d; rake spec )
 ---> Running in 1f880efa0c71
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
dpkg-query: no packages found matching httpd
FFhttpd: unrecognized service
FFFF

Failures:

  1) Package "httpd" should be installed
     On host ``
     Failure/Error: it { should be_installed }
       dpkg-query -f '${Status ..'

[...]

Finished in 0.32489 seconds
6 examples, 6 failures

[...]

/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb failed
2014/09/06 18:35:10 The command [/bin/sh -c ( cd /opt/spec.d; rake spec )] returned a non-zero code: 1
```

The specification run fails (of course), because our container does not yet include a web server. It's
just the sample demo spec from a call to `serverspec-init`. But we're able to inspect to call, so it's
working as follows:

![Serverspec zur Build-Zeit ausführen]({{ site.BASE_PATH }}/assets/images/docker_serverspec_buildtime.png)

**Pro**:

  * You don't have to change things within serverspec (beside installing it in the container)
  * Fits the process in build chains: While building a container, the specification is processed. It
it fails, build chain goes red and stops.
  * When building images on top of each other, each layer can be tested independently. And
one layer would be able to test its prerequisites from a layer below.

**Con**:
  * You have to install serverspec and dependecies (ruby, rake, ..!) within a container though
you do not need it at run time. So basically this really should be uninstalled after successful test,
including an [image squash](http://jasonwilder.com/blog/2014/08/19/squashing-docker-images/) afterwards.
  * We're only able to test static aspects of our container (file, packages, ...), since the container process is not
yet running.
  * Dynamic aspect (process running, port listening, ...) cannot be tested.

If testing static aspects is sufficient and you do not mind the ruby/serverspec overhead, this is a good way to go.

## Using the docker backend of serverspec

Serverspec relies on SpecInfra and its so-called backends. They decide how to
execute spec commands (i.e. using ssh, or simply running them locally). Since v0.4.0
SpecInfra ships with a Docker backend which in turn relies on the `docker-api` gem and
its capabilities to talk to the docker daemon.

It takes an existing image from host, opens it up and replaces the CMD-parameter with
its testing calls. The container is started, not executing the regular container process
but a serverspec-induced call (i.e. ip route show ...) that returns its output to
serverspec for further processing.

We'll give it a try. First we need to install `docker-api`, it needs `mkmf` from ruby-dev, so:

```bash
$ cd serverspec-docker-test

$ sudo apt-get install ruby-dev
[...]

$ sudo gem install docker-api
Building native extensions.  This could take a while...
Fetching: archive-tar-minitar-0.5.2.gem (100%)
Fetching: docker-api-1.13.2.gem (100%)
Successfully installed json-1.8.1
Successfully installed archive-tar-minitar-0.5.2
Successfully installed docker-api-1.13.2
3 gems installed
Installing ri documentation for json-1.8.1...
Installing ri documentation for archive-tar-minitar-0.5.2...
Installing ri documentation for docker-api-1.13.2...
Installing RDoc documentation for json-1.8.1...
Installing RDoc documentation for archive-tar-minitar-0.5.2...
Installing RDoc documentation for docker-api-1.13.2...
```

We need to instruct serverspec to use the docker backend instead of ssh. Modifying
`spec_helper.rb`:

```ruby
require 'serverspec'

# - - - - - Docker backend (insted of local Exec-Helper)- - - - -
include SpecInfra::Helper::Docker
# - - - - - Docker backend (insted of local Exec-Helper)- - - - -
include SpecInfra::Helper::DetectOS

RSpec.configure do |c|
  # - - - - - Image - - - - -
  c.docker_image = '9590610349ba'
  # - - - - - Image - - - - -

  if ENV['ASK_SUDO_PASSWORD']
    require 'highline/import'
    c.sudo_password = ask("Enter sudo password: ") { |q| q.echo = false }
  else
    c.sudo_password = ENV['SUDO_PASSWORD']
  end
end
```

Run:

```bash
$ rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
FFFFFF

Failures:

  1) Package "httpd" should be installed
[...]  

Finished in 1 minute 13.09 seconds
6 examples, 6 failures
[...]  
```

First thing to notice is the additional time it takes to start containers,
since each check in serverspec (like "is package httpd installed") will fire up
a container.

Let's look at the containers `docker ps -a`:

```bash
$ sudo docker ps -a
CONTAINER ID        IMAGE               COMMAND                CREATED             STATUS                        PORTS               NAMES
16643fab8e17        9590610349ba        "/bin/sh -c 'netstat   13 seconds ago      Exited (1) 12 seconds ago                         mad_goldstine
[...]
```

Looking at the COMMAND column we see a netstat command resulting from a spec part
(`port(80), it { should be_listening }`). The container is gone, since this call
from specinfra has been executed.

**Pro**:

  * You don't have to install serverspec within the container, running it on the host is sufficient.

**Contra**:

  * Setting a docker container id in `spec_helper` is not a good way to go, so we'd have to
i.e. use environment variables or a wrapper to query images and test them.
  * Again only static aspects can be tested, since the Docker Backend replaces our CMD-Parameter.

Getting better, we do not have that ruby/rake overhead any more, but still not able to
test running services.

## nsenter

Next level: Looking inside a running container, and have our spec run within. A useful tool
would be [nsenter](http://man7.org/linux/man-pages/man1/nsenter.1.html), allowing us to start
a new process within namespaces of a running container. Nsenter is available as an [installation container](https://github.com/jpetazzo/nsenter),
we'll also show a source-based installation of the `util-linux-2.24` package:

```bash
$ curl --silent https://www.kernel.org/pub/linux/utils/util-linux/v2.24/util-linux-2.24.tar.gz | tar -zxf-
$ cd util-linux-2.24
$ ./configure --without-ncurses
$ make nsenter
$ sudo cp nsenter /usr/local/bin
```

What to do with it? Let's start a sample ubuntu container and inspect its process id:

```bash
$ docker run -tdi ubuntu:14.04
2c67dc16c6f0c1d90e53f5836b7c1de461578b63f903fd4454fafb32b02706f8

$ PID=$(docker inspect --format '{ { .State.Pid }}'  2c67dc16c6f0c1d90e53f5836b7c1de461578b63f903fd4454fafb32b02706f8)
$ echo $PID
9452
```

We use this container process id for our nsenter call, taking all relevant
namespaces (mounts, uts, ipc, network, pid) and running a new shell:

```bash
$ sudo nsenter --target $PID --mount --uts --ipc --net --pid '/bin/sh'
# ps -ef
UID        PID  PPID  C STIME TTY          TIME CMD
root         1     0  0 19:16 ?        00:00:00 /bin/bash
root        29     0  0 19:23 ?        00:00:00 /bin/sh
root        30    29  0 19:23 ?        00:00:00 ps -ef
```

We find ourselves in a shell with some processes, (PID 1=Container process,
PID 29=/bin/sh via nsenter). It would be nice to just run serverspec, if it were there.
Unfortunately our shell process took over the container mount namespace and we have
access to the container file system. Serverspec resides outside, bad luck.

To at least test a bit, we'll reuse the image that we built from our first example above,
where ruby, rake and serverspec has been installed during build time. Its ID was `9590610349ba`:

```bash
$ docker run -tdi 9590610349ba
c84aaa2adeadda9f1ea1fe080110e25b5d68b151aadbe4706ad0538208d82cc9
$ PID=$(docker inspect --format ' { {.State.Pid }} ' c84aaa)
$ echo $PID
9680
```

Running nsenter to get a shell, running serverspec:

```bash
$ sudo nsenter --target $PID --mount --uts --ipc --net --pid '/bin/bash'

root@c84aaa2adead:/# cd /opt/spec.d/

root@c84aaa2adead:/opt/spec.d# rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
dpkg-query: no packages found matching httpd
FFhttpd: unrecognized service
FFFF
[...]

Finished in 0.21691 seconds
6 examples, 6 failures
```

Of course it fails because a webserver is still not installed (which is okay, just
being an example at this point). But now we're inside a container and thus able to
test dynamic aspects such as running processes.

Combining a call to serverspec and nsenter:

```bash
$ sudo nsenter --target $PID --mount --uts --ipc --net --pid -- /bin/bash -c 'cd /opt/spec.d && rake'
```

**Pro**:

  * We're able to test dynamic aspects.

**Con**:

  * Nsenter on the host is an additional dependency.
  * Serverspec is needed wihtin a container.

Not so many advantages over serverspec's docker backend.

## nsenter + serverspec

Another option would be to integrate nsenter into SpecInfra by implementing it as
a separate backend. As of now serverspec does not support nsenter as a backend, so
we give at try, as a prototype:

![Serverspec-Kommandos über nsenter ausführen]({{ site.BASE_PATH }}/assets/images/docker_serverspec_nsenter.png)

We'd need another backend class call `Nsenter` to be implemented and registered
within SpecInfra. It receives a parameter 'nsenter_pid' so it knows, what container
to enter.

```bash
$ cd
$ mkdir nsenter-proto
$ cd nsenter-proto
$ git clone https://github.com/serverspec/specinfra
Cloning into 'specinfra'...
remote: Counting objects: 5305, done.
Receiving objects: 100% (5305/5305), 628.18 KiB | 473.00 KiB/s, done.
remote: Total 5305 (delta 0), reused 0 (delta 0)
Resolving deltas: 100% (2810/2810), done.
Checking connectivity... done.
$ cd specinfra/lib/specinfra
$ vi backend.rb

.. adding a line ..
require 'specinfra/backend/nsenter'

$ vim helper/backend.rb

... adding 'Nsenter' to the type array ...

module SpecInfra
  module Helper
    ['Exec', 'Nsenter', 'Ssh', 'Cmd', 'Docker', 'WinRM', 'ShellScript', 'Dockerfile', 'Lxc'].each do |type|

$ vim configuration.rb

... adding a configuration parameter `nsenter_pid` to Array `VALID_OPTIONS_KEYS` ...

module SpecInfra
  module Configuration
    class << self
      VALID_OPTIONS_KEYS = [
        :path,
[...]
        :request_pty,
        :nsenter_pid,

# The backend class itself is available as a gist, we download it:
# https://gist.github.com/aschmidt75/bb38d971e4f47172e2de
$ curl https://gist.githubusercontent.com/aschmidt75/bb38d971e4f47172e2de/raw/350f9419159ffba282496f90232110e06b77cf69/specinfra_nsenter_prototype >backend/nsenter.rb

# Building a gem, we don't need wercker data for now.

$ cd ../..
$ rm wercker.yml
$ touch wercker.yml

# gem build relies on git-ls to list files, so we add it to our local repo:

$ git add .
$ git commit -m "added nsenter backend"

# build, install
$ gem build specinfra.gemspec --force
  Successfully built RubyGem
  Name: specinfra
  Version: 1.27.0
  File: specinfra-1.27.0.gem

$ sudo gem install specinfra-1.27.0.gem
Successfully installed specinfra-1.27.0
1 gem installed
Installing ri documentation for specinfra-1.27.0...
Installing RDoc documentation for specinfra-1.27.0...
```

Let's build a sample spec and start an image:

```bash
$ cd
$ cd nsenter-proto
$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 2

 + spec/
 + spec/localhost/
 + spec/localhost/httpd_spec.rb
 + spec/spec_helper.rb
 + Rakefile
 ```

Shorting the spec a bit, let's say we just want apache2 to be installed:

```bash
  $ vim spec/localhost/httpd_spec.rb

require 'spec_helper'

describe package('apache2') do
  it { should be_installed }
end
```

Starting an image, we need its PID:

```bash
$ docker run -tdi ubuntu:14.04
9367d023570d4670ca1d12aa431bb826a131a1dcc0b02797a90372489d7927a6
vagrant@docker-workshop:~/nsenter-proto$ docker inspect -f '{ { .State.Pid }}' 9367d0
15344
```

Adapting `spec_helper` to nsenter, giving PID `15344` as parameter:

```bash
$ vim spec/spec_helper.rb

require 'serverspec'

# - - - - - NSENTER - - - - -
include SpecInfra::Helper::Nsenter
# - - - - - - - -
include Serverspec::Helper::Debian

RSpec.configure do |c|

  # - - - - - rake PID for NSENTER from environment - - - - -
  c.nsenter_pid = ENV['NSENTER_PID']

  if ENV['ASK_SUDO_PASSWORD']

```

Putting it all together:

```bash
$ NSENTER_PID=15344 rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
nsenter_exec! sudo dpkg-query -f '${Status}' -W apache2 | grep -E '^(install|hold) ok installed$'
F

Failures:

  1) Package "apache2" should be installed
     On host ``
     Failure/Error: it { should be_installed }
       sudo dpkg-query -f '${Status}' -W apache2 | grep -E '^(install|hold) ok installed$'
       expected Package "apache2" to be installed
     # ./spec/localhost/httpd_spec.rb:4:in `block (2 levels) in <top (required)>'

Finished in 0.02865 seconds
1 example, 1 failure
```

The sample nsenter backend gist included a debug string _nsenter_exec!_ which shows
that it is used and that it is about to transport its `sudo dpkg-query ... ` into the container.
Still failing of course, so we attach to our running container and install it:

```bash
$ docker attach 9367

root@9367d023570d:/# apt-get update -yqq
root@9367d023570d:/# apt-get -yqq install apache2
Preconfiguring packages ...
[...]

[CRTL-P], [CTRL-Q] to detach
```

Again:

```bash
$ NSENTER_PID=15344 rake spec
/usr/bin/ruby1.9.1 -S rspec spec/localhost/httpd_spec.rb
nsenter_exec! sudo dpkg-query -f '${Status}' -W apache2 | grep -E '^(install|hold) ok installed$'
.

Finished in 0.05324 seconds
1 example, 0 failures
```

That worked!

**Pro**:

  * If nsenter would be a regular SpecInfra backend we'd be able to test running
containers alltogether with both their static and dynamic aspects.
  * no need for a serverspec installation within a container.

**Con**:

  * Nsenter is needed on the host, including a sudoers entry.
  * Would need a wrapper within spec_helper to automatically query Process PID from
containers.

So this protoype worked out, but it's still a prototype without test coverage and all.
However if a decent version of nsenter (util-linux 2.24+, being capable of attaching to all namespaces)
makes it into the distros and SpecInfra (i.e. 2.X+) contains nsenter as a backend, this might be a
good way to test running containers.

## conclusion

After all, testing containers with serverspec is worth it, and we still have options:

  * we're able to test static things such as file systems, packages and the like using
the docker backend or at build time by placing it into Dockerfile.
  * for those of you using containers as a replacement for VMs, running serverspec over ssh
is an easy way.
  * nsenter seems to be a viable option if future development of util-linux and specinfra permit.

--
Andreas & Peter

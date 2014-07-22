---
layout: post
title: "Hosts mit Docker und Puppet provisionieren"
modified: 2014-07-03 20:33:04 +0200
tags: [draft, tech,docker,andreasschmidt ]
category: docker
links:
  - Backends für die Entwicklung mit Vagrant und Docker starten: http://maori.geek.nz/post/vagrant_with_docker_how_to_set_up_postgres_elasticsearch_and_redis_on_mac_os_x
  - Vagrant Docker Provisioner: http://docs.vagrantup.com/v2/provisioning/docker.html
  - Vagrant Docker Provider: https://docs.vagrantup.com/v2/docker/basics.html
keywords:
  - docker
  - serverspec
  - puppet
  - vagrant
---

Die ersten Schritte mit Docker gestalten sich durch [boot2docker](2014-06-30-docker-mit-boot2docker-starten.md)
recht einfach, so hat man schnell eine Spielwiese erstellt, um die Funktionalität
ausprobieren zu können. Aber spätestens wenn Docker-Container im Test- oder Produktionssystem live gestellt werden sollen,
stellt sich die Frage nach dem reproduzierbaren Aufsetzen eines Docker-Hosts.
Das kann unter anderem mit Puppet gemacht werden. Um das ganze testbar zu haben, empfiehlt
sich die Kombination mit [serverspec](http://www.serverspec.org).

## Vagrant/Docker-Provisioning

Vagrant bietet selber einen [Docker-Provisioner](http://docs.vagrantup.com/v2/provisioning/docker.html) an.
(Nicht zu verwechseln mit dem Docker-Provider, der Docker als Backend verwendet, damit Vagrant
Container anstelle von VMs startet...). Der Provisioner ist in der Lage, Docker
auf der gestartetem VM zu installieren, mit Images zu bestücken und
daraus Container zu starten. Die Konfiguration des Docker-Daemons ist davon noch ausgenommen.

Das ist schon eine gute Abkürzung auf dem Weg in Richtung Reproduzierbarkeit, sie hängt
allerdings auch davon ab, wie weit in der Delivery Chain Vagrant zum Einsatz kommt. Wenn z.B.
das Livesystem auf einer Virtualisierung beruht, die nicht durch ein Vagrant-Backend
unterstützt wird, kommt man mit dem Docker-Provisioner an der Stelle nicht weiter.

## Puppet-Modul für Docker

Eine mögliche Lösung ist, Puppet für die Installation und Konfiguration des Docker-Daemons
zu verwenden. Ein Puppet-Modul kann getestet werden, lässt sich in Vagrant über den
Puppet-Provisioner integrieren und auf allen Stages der Delivery-Chain nutzen.

Wenn man in der PuppetForge nach Docker sucht, wird man schnell bei dem [Modul](https://forge.puppetlabs.com/garethr/docker) von
Gareth Rushgrove fündig. Damit lässt sich Docker installieren, in Teilen konfigurieren,
Images lassen sich herunterladen und Container können gestartet werden.

Und wir möchten das ganze natürlich mit Serverspec's hinterlegt haben, um zu testen,
was wir provisionieren.

Alle Schritte können mit dem Github-Repository [aschmidt75/docker-testing-playground](https://github.com/aschmidt75/docker-testing-playground)
nachvollzogen werden. Im Text finden sich in den Abschnitten (Git-Tag)-Einträge, die
auf Tags im Repository verweisen. So lassen sich einzelne Stände nachvollziehen.

Los geht's!

### Leere VM ...

Wir starten mit einem einfach Vagrant-File, das eine einzelne VM auf Basis
Ubuntu 14.04 aufbaut, und zum Start ein Update der installierten Pakete ausführt:

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "trusty64"
  config.vm.box_url = "http://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"

  config.vm.define "docker-test1", primary: true do |s|

    # update system
    s.vm.provision "shell", inline: <<EOS
test -f /var/tmp/provisioned || {
	sudo apt-get -y update
	sudo date >> /var/tmp/provisioned
}
EOS

  end

end
```
(Git-Tag v1)


### Serverspec-Basis dazu

Die VM können wir mit `vagrant up` starten, sind aber noch nicht so weit gekommen. Um unsere
Installation testbar zu machen, brauche wir serverspec. Es gibt ein Vagrant-Plugin für
Serverspec, allerdings ist das Zusammenspiel mit verschiedenen Versionen von serverspec,
Vagrant und dem Plugin noch nicht ideal. Außerdem möchten wir Serverspec-Spezifikation
auch später ohne Vagrant weiterverwenden können. Von daher installieren wir mit einem
Shell Provisioner Serverspec plus Abhängigkeiten und gehen davon aus, dass wir unsere Specs
über eine Synced-Folder in die VM reinreichen.

```bash
$ mkdir spec.d
$ vi Vagrantfile
```

```ruby
    s.vm.synced_folder "spec.d/", "/mnt/spec.d"
(...)
    # install & run serverspec
    s.vm.provision 'shell', inline: <<EOS
( sudo gem list --local | grep -q serverspec ) || sudo gem install specinfra serverspec rake
cd /mnt/spec.d
rake spec

EOS
```
(Git-Tag v2)


Dann muss wg. des Mounts die VM neu gestartet und provisioniert werden:

```
$ vagrant reload
$ vagrant provision
(...)
==> docker-test1: Running provisioner: shell...
    docker-test1: Running: inline script
==> docker-test1: stdin: is not a tty
==> docker-test1: Successfully installed specinfra-1.21.0
==> docker-test1: Successfully installed net-ssh-2.9.1
(...)
==> docker-test1: rake aborted!
==> docker-test1: No Rakefile found (looking for: rakefile, Rakefile, rakefile.rb, Rakefile.rb)
==> docker-test1: (See full trace by running task with --trace)
```

### Spezifikation formulieren

D.h. serverspec wurde installiert, aber da keine Specs vorhanden sind, kann der `rake spec`-Aufruf
natürlich noch nichts tun. Wir legen uns (auf dem Host) über `serverspec-init` eine leere Spezifikations-Hülle hin,
das HTTP-Beispiel wird durch das ersetzt, was wir testen wollen:

```
$ cd spec.d
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
$ rm spec/localhost/httpd_spec.rb
$ vim spec/localhost/docker_spec.rb

require 'spec_helper'

describe 'It should have docker installed' do
end
```
(Git-Tag v3)

Ein `vagrant provision` zeigt nun:

```bash
 vagrant provision
==> docker-test1: Running provisioner: shell...
    docker-test1: Running: inline script
==> docker-test1: stdin: is not a tty
==> docker-test1: Running provisioner: shell...
    docker-test1: Running: inline script
==> docker-test1: stdin: is not a tty
==> docker-test1: /usr/bin/ruby1.9.1 -S rspec spec/localhost/docker_spec.rb
==> docker-test1: No examples found.
==> docker-test1:
==> docker-test1: Finished in 0.00006 seconds
==> docker-test1: 0 examples, 0 failures
```

Im Spec-File können wir jetzt ausdrücken, wie Docker installiert sein sollte, z.B. so:

```bash
$ vim spec.d/spec/localhost/docker_spec.rb
```

und den leeren describe-Block ersetzen durch:

```ruby
describe 'It should have docker installed' do
	describe package 'lxc-docker' do
		it { should be_installed }
	end

	describe group 'docker' do
		it { should exist }
	end

	describe file '/var/run/docker.sock' do
		it { should be_socket }
		it { should be_owned_by 'root' }
		it { should be_grouped_into 'docker' }
	end

end
```

Das entspricht der Standardinstallation über das Repository von Docker. Ein `vagrant provision` zeigt nun
eine Menge Fehler, da ja noch nichts installiert ist.

```bash
$ vagrant provision
(...)
Finished in 0.10243 seconds
5 examples, 5 failures

Failed examples:

rspec ./spec/localhost/docker_spec.rb:5 # It should have docker installed Package "lxc-docker" should be installed
rspec ./spec/localhost/docker_spec.rb:9 # It should have docker installed Group "docker" should exist []
rspec ./spec/localhost/docker_spec.rb:13 # It should have docker installed File "/var/run/docker.sock" should be socket
rspec ./spec/localhost/docker_spec.rb:14 # It should have docker installed File "/var/run/docker.sock" should be owned by "root"
rspec ./spec/localhost/docker_spec.rb:15 # It should have docker installed File "/var/run/docker.sock" should be grouped into "docker"
(...)

```
(Git-Tag v4)

### Das Puppet-Modul hinzufügen ...

Wir möchte Docker über Puppet und das Puppetmodul aus der Forge installieren. D.h. es lohnt sich
auch, das als Serverspec auszudrücken, und dann umzusetzen:

```
$ vim spec.d/spec/localhost/puppet_spec.rb
(..einfügen..)
require 'spec_helper'

describe package 'puppet' do
	it { should be_installed }
end

describe 'It should have the garethr-docker module' do
	describe file '/etc/puppet/modules/docker' do
		it { should be_directory }
		it { should be_mode '755' }
	end

	describe command 'puppet module list' do
		its(:stdout) { should match 'garethr-docker' }
	end
end
```

Ein `vagrant provision` zeigt nun natürlich noch mehr Fehler an. Wir beheben das ganze,
indem das Vagrantfile um einen Shell-Provisioner-Abschnitt ergänzt wird, der über puppet
das Modul nachinstalliert, solange es noch nicht vorhanden ist:

```ruby
$ vi Vagrantfile

(...)
    sudo date >> /var/tmp/provisioned
}

EOS

    # install puppet module for docker
    s.vm.provision "shell", inline:
		  'sudo su - -c "( puppet module list | grep -q garethr-docker ) || puppet module install garethr-docker"'

    # install & run serverspec
(...)
```

```bash
$ vagrant provision
(...)
==> docker-test1: Running provisioner: shell...
    docker-test1: Running: inline script
==> docker-test1: stdin: is not a tty
==> docker-test1: stdin: is not a tty
==> docker-test1: Notice: Preparing to install into /etc/puppet/modules ...
==> docker-test1: Notice: Downloading from https://forge.puppetlabs.com ...
==> docker-test1: Notice: Installing -- do not interrupt ...
==> docker-test1: /etc/puppet/modules
==> docker-test1: └─┬ garethr-docker (v1.1.3)
==> docker-test1:   ├── puppetlabs-apt (v1.5.1)
==> docker-test1:   ├── puppetlabs-stdlib (v4.3.0)
==> docker-test1:   └── stahnma-epel (v0.1.0)
(...)
Finished in 1.11 seconds
9 examples, 5 failures

Failed examples:
(...)
```
(Git-Tag v5)

### Docker über Puppet installieren

Im Serverspec-Teil sind allerdings die 4 Examples für Puppet grün, nur die Docker-Examples
sind rot. Also müssen wir jetzt Docker installieren. Dazu bauen wir ein Puppet-Modul,
welches über den Puppet-Provisioner in Vagrant ausgerollt wird. Erst einmal eine leere Hülle:

```bash
$ mkdir puppet.d
$ mkdir puppet.d/manifests
$ mkdir puppet.d/modules
$ vim puppet.d/manifests/default.pp
(..einfügen..)

notify { "Running puppet apply on $hostname": }

$ vi Vagrantfile
(..einfügen..)

    # provision the node
    s.vm.provision :puppet, :options => "--verbose" do |puppet|
        puppet.manifests_path = "puppet.d/manifests"
        puppet.module_path = "puppet.d/modules"
        puppet.manifest_file = "default.pp"
    end

    # install & run serverspec
(...)
```

Da der Puppet-Provisioner intern einen Synced-Folder erzeugt, müssen wir die
VM reloaden, danach kann provisioniert werden:

```bash
$ vagrant reload
(...)
$ vagrant provision
(...)
==> docker-test1: Running provisioner: puppet...
==> docker-test1: Running Puppet with default.pp...
==> docker-test1: stdin: is not a tty
(...)
==> docker-test1: Notice: Compiled catalog for vagrant-ubuntu-trusty-64.epost.de in environment production in 0.03 seconds
(...)
==> docker-test1: Info: Applying configuration version '1405518114'
==> docker-test1: Notice: Running puppet apply on vagrant-ubuntu-trusty-64
==> docker-test1: Notice: /Stage[main]/Main/Notify[Running puppet apply on vagrant-ubuntu-trusty-64]/message: defined 'message' as 'Running puppet apply on vagrant-ubuntu-trusty-64'
==> docker-test1: Info: Creating state file /var/lib/puppet/state/state.yaml
==> docker-test1: Notice: Finished catalog run in 0.03 seconds

(...)

(...Fehler von serverspec, weil Docker noch nicht installiert ist...)

```
(Git-Tag v6)

Damit fehlt jetzt "nur" noch das was eigentlich wollten, nämlich Docker zu installieren :-)
Das geht mit dem Modul aus der Puppetforge sehr einfach. Wir implementieren ein Modul,
bestehend aus Subklassen install, run in eigenen .pp-Dateien
und der Abhängigkeit. Im install-Bereich kommt die Docker-Klasse ins Spiel, wo
die Konfiguration des Daemons gesetzt werden kann.


```bash
$ mkdir -p puppet.d/modules/docker_host/{manifests,templates}
$ vi puppet.d/modules/docker_host/manifests/init.pp
class docker_host {
  notify { 'in docker_host': }

  class { 'docker_host::install': }

  class { 'docker_host::run': }

  Class['docker_host::install'] -> Class['docker_host::run']
}
$ vi puppet.d/modules/docker_host/manifests/install.pp
include 'docker'

class docker_host::install {
  class { 'docker':
    manage_kernel => false,
    tcp_bind      => 'tcp://127.0.0.1:4243',
    socket_bind   => 'unix:///var/run/docker.sock',
  }
}
$ vi puppet.d/modules/docker_host/manifests/run.pp
class docker_host::run {
}
$ vi puppet.d/manifests/default.pp
(...einfügen..)
class { 'docker_host': }
```
(Git-Tag v7)

Ein `vagrant provision` dauert nun schon etwas länger, da Docker nun auch
installiert wird:

```bash
==> docker-test1: Notice: Running puppet apply on vagrant-ubuntu-trusty-64
==> docker-test1: Notice: /Stage[main]/Main/Notify[Running puppet apply on vagrant-ubuntu-trusty-64]/message: defined 'message' as 'Running puppet apply on vagrant-ubuntu-trusty-64'
==> docker-test1: Notice: /Stage[main]/Docker::Install/Package[cgroup-lite]/ensure: ensure changed 'purged' to 'present'
==> docker-test1: Notice: /Stage[main]/Docker::Install/Apt::Source[docker]/Apt::Key[Add key: A88D21E9 from Apt::Source docker]/Apt_key[Add key: A88D21E9 from Apt::Source docker]/ensure: created
==> docker-test1: Notice: in docker_host
==> docker-test1: Notice: /Stage[main]/Docker_host/Notify[in docker_host]/message: defined 'message' as 'in docker_host'
==> docker-test1: Notice: /Stage[main]/Docker::Install/Apt::Source[docker]/Apt::Pin[docker]/File[docker.pref]/ensure: created
==> docker-test1: Notice: /Stage[main]/Docker::Install/Apt::Source[docker]/File[docker.list]/ensure: created
==> docker-test1: Info: /Stage[main]/Docker::Install/Apt::Source[docker]/File[docker.list]: Scheduling refresh of Exec[apt_update]
==> docker-test1: Info: /Stage[main]/Docker::Install/Apt::Source[docker]/File[docker.list]: Scheduling refresh of Exec[Required packages: 'debian-keyring debian-archive-keyring' for docker]
==> docker-test1: Notice: /Stage[main]/Docker::Install/Apt::Source[docker]/Exec[Required packages: 'debian-keyring debian-archive-keyring' for docker]: Triggered 'refresh' from 1 events
==> docker-test1: Notice: /Stage[main]/Apt::Update/Exec[apt_update]: Triggered 'refresh' from 1 events
==> docker-test1: Notice: /Stage[main]/Docker::Install/Package[docker]/ensure: ensure changed 'purged' to 'present'
==> docker-test1: Info: /Stage[main]/Docker::Service/File[/etc/default/docker]: Filebucketed /etc/default/docker to puppet with sum ce88dab1dcba6f92903120b9beba2521
==> docker-test1: Notice: /Stage[main]/Docker::Service/File[/etc/default/docker]/content: content changed '{md5}ce88dab1dcba6f92903120b9beba2521' to '{md5}c44278611ed762b2de4b5b78cda333e6'
==> docker-test1: Info: /Stage[main]/Docker::Service/File[/etc/default/docker]: Scheduling refresh of Service[docker]
==> docker-test1: Info: /Stage[main]/Docker::Service/File[/etc/init.d/docker]: Filebucketed /etc/init.d/docker to puppet with sum d9d2305259b22bfbc1086939a23df23a
==> docker-test1: Notice: /Stage[main]/Docker::Service/File[/etc/init.d/docker]/ensure: removed
==> docker-test1: Info: /Stage[main]/Docker::Service/File[/etc/init.d/docker]: Scheduling refresh of Service[docker]
==> docker-test1: Notice: /Stage[main]/Docker::Service/Service[docker]: Triggered 'refresh' from 2 events
==> docker-test1: Notice: Finished catalog run in 148.66 seconds

(... und die Specs ...)
==> docker-test1: /usr/bin/ruby1.9.1 -S rspec spec/localhost/docker_spec.rb spec/localhost/puppet_spec.rb
(...)
==> docker-test1: Finished in 0.9264 seconds
==> docker-test1: 9 examples, 0 failures
```

### Fertig

Geschafft! Wir haben eine virtuelle Maschine, die über Puppet Docker installiert und konfiguriert,
und das ganze mit Hilfe von Serverspec testet.

Wenn man die Serverspec-Ausgabe detailliert mitverfolgen möchte, hilft ein --format-Eintrag im
Rakefile:

```
$ vi spec.d/Rakefile
RSpec::Core::RakeTask.new(:spec) do |t|
 t.pattern = 'spec/*/*_spec.rb'
 t.rspec_opts = '--format documentation'
end
````

Damit kann man serverspec bei der Arbeit zusehen, allerdings kann die Ausgabe mit steigendem Umfang
der Spec auch recht lang werden.

--
Andreas

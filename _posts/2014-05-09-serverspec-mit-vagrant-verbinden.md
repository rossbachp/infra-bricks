---
layout: post
title: serverspec mit Vagrant verbinden
modified: 2014-04-24 09:43:50 +0200
tags: [serverspec,vagrant,virtualbox,peterrossbach]
category: testing
links:
  - 2Creatives: https://github.com/2creatives/vagrant-centos/
  - serverspec: http://www.serverspec.org
  - serverspec vagrant plugin: https://github.com/jvoorhis/vagrant-serverspec
  - vagrant: http://vagrantup.com
  - virtualbox: http://www.virtualbox.org
keywords:
  - vagrant
  - serverspec
  - tutorial
  - testing
  - provisioning
---

Eine späte Integration der eigenen Software in die Produktionsumgebung rächt sich meistens. Der Kundennutzen muss immer früher sicher hergestellet werden. Jede Änderung soll geschwindt in die Produktion, um dort zu beweisen, ob diese Eigenschaft den gewünschten Nutzen wirklich bietet. Natürlich soll kein Fehler in die Produktion gelangen. Die Änderungen müssen überprüft werden und durch verschiedene aufeinander aufbauende Umgebungen die Qualität sicher gestellt werden. Um so eher dies gelingt, um so schneller kann eine gezielte Korrektur erfolgen.

Das Ziel sollte es sein eine Deployment Pipeline zu installieren [Jez Humble, David Farley: "Continuous Delivery", 2011 Pearson Education]. Damit das Feedback schnellst möglich gelingt, ist es ratsam schon früh die Integration in die Produktionumgebung zu realisieren und die Teilinstallation am eigenen Arbeitsplatz zu überprüfen. Dieser Artikel beschreibt die Erstellung einer Apache Httpd -Installation mit [Vagrant](http://vagrantup.com) und [Virtualbox](http://www.virtualbox.org. Die Besonderheit ist der Einsatz von [serverspec](http://serverspec.org) zur Valdierung der Provisionierung.

Der Plan ist, einen Apache httpd Service in einer CentOS 6.5 Box aufzusetzen und sicherzustellen, dass der Webserver wirklich läuft. Als ersten Schritt wird ein entsprechendes Basis CentOS 6.5 Image mithilfe von Vagrant auf die lokale Virtualbox installieren. Damit also die folgenden Schritte praktisch nachvollzogen werden können, bedarf es einer entsprechende Installation von Vagrant und Virtualbox auf dem System. Entsprechende Anleitungen dazu befinden sich auf den Websites der beiden OpenSource Projekte.

Ein gesichertes Betriebssystem für die eigene Vagrant Box zu bekommen ist nicht einfach. Zum guten Gelingen und notwendigen Beitrag der Sicherheit, sollten man diese Installation lieber selbst in die Hand nehmen. Mit den Projekten [Packer](http://www.packer.io/) oder [Veewee](https://github.com/jedi4ever/veewee) kann dies komfortabel für verschiedene Betriebssysteme, virtuelle Plattformen und Clouds umgesetzt werden. Eine gute Kenntnis der Installation von Betriebssystemen und viel Geduld, führt dann langsam zum Ziel. Natürlich gibt es auch fertige Boxen. Für Vagrant gibt es neben dem Cloud Angebot [Vagrant Cloud](https://vagrantcloud.com/) natürlich auch eine freie Sammlung [Vagrantbox](http://www.vagrantbox.es/). Eine sehr einfache und leicht nachzuvollziehende CentOS 6.5 Installation wird von [2Creatives](https://github.com/2creatives/vagrant-centos/) bereitgestellt. Die Box wird regelmässig aktualisiert und steuert sehr direkt die Management Schnittstelle von Virtualbox an. Die Box kann nun mit folgendem Vagrant-Befehl auf der eigenen Maschine bereitgestellt werden:

```bash
$ mkdir apache-specbox
$ cd apache-specbox
$ vi Vagrantfile
```

Mit dem folgenden Vagrant Konfiguration wird die CentOS-Box von 2creatives geladen, ein privates Netzwerk zusätzlich geschaffen, der Ressourcenbedarf festgelegt und der Name `apacheSpecbox` der neuen Virtualbox-Node vergeben.

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :
## Vagrantfile

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "2creatives/centos65-x86_64-20140116"
  config.vm.box_url = "https://github.com/2creatives/vagrant-centos/releases/download/v6.5.3/centos65-x86_64-20140116.box"
  config.vm.box_download_checksum_type="sha256"
  config.vm.box_download_checksum = "84eda9c4f00c86b62509d1007d4f1cf16b86bccb3795659cb56d1ea0007c3adc"

  config.vm.define :apacheSpecbox do |c|
    c.vm.network "private_network", ip: "192.168.33.10"
    c.vm.host_name = "apacheSpecbox.example.com"
    c.vm.provider "virtualbox" do |vb|
         vb.gui = false
         vb.customize [ "modifyvm", :id, "--memory", "512"]
         vb.customize [ "modifyvm", :id, "--cpus", "1"]
         vb.name = "apacheSpecbox"
  end

end
```

Dann ein:

```bash
$ vagrant up
```

Die Voraussetzungen für eine Apache httpd Installation sind also nun gegeben. Als nächsten Schritt könnte man mit dem Befehl `vagrant ssh` sich auf die neue `apacheSpecbox` anmelden und den Apache mit dem Package Manager manuell installieren. Allerdings wären das gleich mehrere Verstöße der guten Sitten. Alles und damit ist wirklich ALLES gemeint, muss durch entsprechende Programmierung automatisch nachvollzogen und prüfbar sein. Hmm, welche Anforderungen muss soll die Installation eines Apaches den wirklich erfüllen? Wie kann man durch ein Werkzeug die Überprüfung formulieren und ausführbar machen? Genau an dieser Stelle beginnt dann die Suche im Netz, nach Ideen und Lösungen. Seit nunmehr zwei Jahren gibt es das kleine Projekt [serverspec](http://www.serverspec.org) von Gosuke Miyashita, das sich als Antwort auf diese Fragen entpuppt.

![Mit Serverspec eine Provisionierung von Vagrant valideren]({{ site.BASE_PATH }}/assets/images/vagrant-serverspec.png)

Damit die Installation wiederholbar ist und dokumentiert wird, wird ein Gemfile erzeugt und mit dem `ruby bundler`
die Installation gestartet.

```bash
$ vi Gemfile
```

```ruby
## Gemfile
ruby '2.1.1'

source 'https://rubygems.org'

gem 'serverspec'
```

```bash
$ bundle install
$ serverspec-init
$ rake
```

Mit dem Kommando `serverspec-init` wird die Testumgebung zur Prüfung der Installation erzeugt. Das Werkzeug serverspec kann für verschiedene Unix Plattformen und Windows genutzt werden. Es kann remote via ssh oder lokal mit der jeweiligen Shell ausgeführt werden. Schön ist, dass der Generator gleich eine Variante für den ssh-Zugang einer Vagrant Box generieren kann. Wie für die Aufgabe gemacht, wird gleich eine Apache httpd-Testspezifikation mitgeneriert.

```bash
$ serverspec-init
Select OS type:

  1) UN*X
  2) Windows

Select number: 1

Select a backend type:

  1) SSH
  2) Exec (local)

Select number: 1

Vagrant instance y/n: y
Auto-configure Vagrant from Vagrantfile? y/n: y
 + spec/
 + spec/apacheSpecbox/
 + spec/apacheSpecbox/httpd_spec.rb
 + spec/spec_helper.rb
 + Rakefile
###
```

Eine Überprüfung der Node zeigt, dass der Apache noch nicht installiert ist. Stimmt!

```bash
$ rake spec
/usr/bin/ruby -S rspec spec/apacheSpecbox/httpd_spec.rb
FFFFFF
...viele Fehlermeldungen...

Finished in 0.99715 seconds
6 examples, 6 failures
```

Ein Blick auf die Spezifikation `spec/apacheSpecbox/httpd_spec.rb` zeigt die Anforderungen. Das httpd-Package soll installiert sein. Der httpd soll als OS-Service konfiguiert werden. Wie gewohnt soll der Apache unter dem Port 80 erreichbar sein.

```ruby
## spec/apacheSpecbox/httpd-spec.rb
require 'spec_helper'

describe package('httpd') do
  it { should be_installed }
end

describe service('httpd') do
  it { should be_enabled   }
  it { should be_running   }
end

describe port(80) do
  it { should be_listening }
end

describe file('/etc/httpd/conf/httpd.conf') do
  it { should be_file }
end
```

Zum Erreichen dieses Ziels, muss die Node nun provisioniert werden. Vagrant bringt eine Vielzahl von entsprechenden Plugins für Ansible, Chef, Puppet, Saltstack oder Shell gleich mit. Zur Umsetzung der Anforderungen reicht der Shell-Provisioner erstmal völlig aus. Durch folgende Änderungen in der Datei Vagrantfile kann dies schnell implementiert werden.

{% highlight ruby %}
# -*- mode: ruby -*-
# vi: set ft=ruby :
## Vagrantfile

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "2creatives/centos65-x86_64-20140116"
  config.vm.box_url = "https://github.com/2creatives/vagrant-centos/releases/download/v6.5.3/centos65-x86_64-20140116.box"
  config.vm.box_download_checksum_type="sha256"
  config.vm.box_download_checksum = "84eda9c4f00c86b62509d1007d4f1cf16b86bccb3795659cb56d1ea0007c3adc"

  config.vm.define :apacheSpecbox do |c|
    c.vm.network "private_network", ip: "192.168.33.10"
    c.vm.host_name = "apacheSpecbox.example.com"
    c.vm.provider "virtualbox" do |vb|
         vb.gui = false
         vb.customize [ "modifyvm", :id, "--memory", "512"]
         vb.customize [ "modifyvm", :id, "--cpus", "1"]
         vb.name = "apacheSpecbox"
    end

    c.vm.provision "shell",
         inline: <<SCRIPT
echo I am provisioning...
yum -y install httpd
date > /etc/vagrant_provisioned_at
SCRIPT

    end

end
{% endhighlight %}

Mit dem Befehl `vagrant provision` wird nun die Provisionierung ausgeführt. Ein erneuter Test zeigt, dass nun der Apache durch die Packages zwar installiert ist, aber er weder gestartet, noch als Service angemeldet ist. Weiterhin fehlt das Package `nc`, damit serverspec die Tests auf dem Port durchführen kann. Weiterhin wäre es auch schön, wenn der httpd Server auch den richtigen ServerName bekommt. Durch eine Modifikation unseres kleinen Inline Provisinierungsskripts lässt sich das schnell erledigen.

```ruby

   c.vm.provision "shell",
         inline: <<SCRIPT
echo I am provisioning...
yum -y install httpd nc
sed -i 's/#ServerName www.example.com:80/ServerName apacheSpecbox.example.com:80/g' /etc/httpd/conf/httpd.conf
chkconfig httpd on --level 2345
service httpd restart
date > /etc/vagrant_provisioned_at
SCRIPT
```
Mit der nächsten Provisionierung gelingt nun die Verifikation. Unser Ergebnis ist das erstmal __Grün__!

```bash
$ vagrant provision
$ rake spec
/usr/bin/ruby -S rspec spec/apacheSpecbox/httpd_spec.rb
.......

Finished in 0.99715 seconds
6 examples, 0 failures
```

Die Validierung bringt zu Tage, dass die Basisanforderungen erfüllt und überprüft werden können. Weiterhin sind alle Schritte der Installation und der Testausführung beschrieben. Eine wiederholbare Testprozedur für die Apache httpd Installation ist implementiert. Als Verfahren sind die Test vor der Implementierung umgesetzt worden. Eine noch bessere Integration von Serverspec und Vagrant existiert im Projekt [vagrant-serverspec plugin](https://github.com/jvoorhis/vagrant-serverspec).

Die Installation des Plugin erfolgt mit folgendem Befehl:

```bash
$ vagrant plugin install vagrant-serverspec
```

Die Integration als Vagrant Provisioner erfolgt im Konfigurations-Block des Nodes `apacheSpecbox`

{% highlight ruby %}
## Vagrantfile
	c.vm.provision :serverspec do |spec|
       spec.pattern = 'specs/apacheSpecbox/*_spec.rb'
    end
{% endhighlight %}

Für die Ausführung dieser Variante bietet sich an, die gesamte Provisionierung einfach zu wiederholen.
Dazu zerstören man den aktuellen Node und setzen diesen komplette neu auf. Mithilfe des Plugins werden nun unsere Test sofort ausgeführt. Volia!

```bash
$ vagrant destroy apacheSpecbox
$ vagrant up apacheSpecbox
# look at results
```

Leider ist die Version von Serverspec im Plugin veraltet. Deshalb raten ist zur Zeit die direkten Installation der bessere Weg. Die Gestaltung von flexiblen Testspecs ist damit zukunfsträchtiger. Ein wichtiger erster Schritt für die Bereitstellung von testgetriebener Infrastruktur ist vollbracht. Ein Testfirst-Ansatz für die Infrastruktur ist also ohne wesentlichen Aufwand möglich. Eine inkrementellere Arbeitsweise für die Erstellung von Systemen leicht umsetzbar.

Nun geht es an die Verbesserung des Erreichten. In diesem Blog wird es dazu noch viel zu lesen geben.

--
Peter

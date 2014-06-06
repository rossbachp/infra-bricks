---
layout: post
title: "Security-Tests mit serverspec"
modified: 2014-05-23 14:18:18 +0200
tags: [draft, serverspec,security,testing,andreasschmidt ]
category: security
image:
  feature:
  credit:
  creditlink:
comments:
share:
---

Sichere Systeme zu bauen und zu betreiben ist eine kontinuierliche Herausforderung. Ein erster Ansatz ist,
Sicherheitsaspekte zu spezifizieren und testbar zu machen. Serverspec besitzt eine Reihe von nützlichen Eigenschaften,
um dem Ziel näher zu kommen.

Durch die deklarative rspec-Syntax ist es möglich, Infrastrukturspezifikationen zu verfassen, die Security-relevante
Aspekte wie etwa Berechtigungen beschreiben. Und das ganze wird natürlich auf Knopfdruck testbar.

# You should_not ...

Eine praktische Eigenschaft ist dabei, Eigenschaften ausdrücken, die eben nicht vorliegen sollten. Dazu
bietet rspec das Schlüsselwort `should_not` an, wie z.B. in

```ruby
describe file '/etc/...' do
  its(:content) { should_not contain(/PermitRootLogins.*Yes/) }
end
```

Security-Tests beziehen sich natürlich nicht nur auf Eigenschaften von Dateien, sondern auf
viel mehr, beispielsweise:

- Pakete: Manche Pakete sollten besser nicht installiert sein (Beispiel: sendmail)
- Dienste: Service sollten nicht laufen, und auch nicht enabled sein. Andere sollten auf jeden Fall laufen (z.B. iptables)
- Die Dateiberechtigungen betreffen vor allem World-Rechte und Ausführbarkeit. Die sollten stark eingeschränkt sein.
- Dateien sollten nur den Nutzer gehören, die sie zur Ausführung benötigen.
- Manche User sollten keine Shell haben.
- (NFS-)Mounts, die nur als Dateiablage dienen, sollten auch nicht ausführbar sein.
- Services die Ports öffnen, sollten dies nur auf bestimmten IPs tun.
- Konfigurationsdateien für Services wie bspw. Apache sollten sichere Einstellungen beinhalten, z.B. aktuelle SSL Cipher Suites
- Die Zertifikate und Schlüssel müssen die richtigen sein, z.B. auch mit hoher Schlüsselstärke
- ... und vieles mehr.

Das lässt sich ganz gut mit serverspec beschreiben.

# Pakete

Um auszudrücken, dass eine Menge an Paketen nicht installiert sein sollte, kann man z.B.
mit einem Iterator über eine Liste wandern und einen describe-Block aufbauen (Beispiel mit
Paketnamen für RedHat bzw. CentOS):

```ruby
%W( bluetooth cups isdn tftp autofs ).each do |pkgname|
  describe package pkgname do
    it { should_not be_installed }
  end
end
```

Ähnliches mit Services (sowohl Negativ- als auch Positiv-Beispiele):

```ruby
%W( sendmail ).each do |s|
  describe service s do
    it { should_not be_enabled }
    it { should_not be_running }
  end
end

%W( iptables ).each do |s|
  describe service s do
    it { should be_enabled }
    it { should be_running }
  end
end
```

# Nutzer ohne Shell

Hier lässt Linux mehrere Varianten zu, eine ist /bin/nologin. Puppet erhält
beispielsweise einen eigenen Laufzeituser, der sollte aber ebenfalls keine Shell
besitzen (wird mit /bin/false eingerichtet).

```ruby
describe user 'apache' do
  it { should have_login_shell '/bin/nologin' }
end
describe user 'puppet' do
  it { should have_login_shell '/bin/false' }
end

```

# NFS-Mounts

NFS-Mounts, die nur zur Ablage von Dateien verwendet werden, sollten nicht
mit dem `executable`-Flag gemountet werden:

```ruby
describe file('/') do
  it { should_not be_mounted.with(
    :options => { :executable => true }
  ) }
end
```

# Konfigurationsdateien am Beispiel Apache

Zur Absicherung einer Webserver-Konfiguration wie bspw. dem Apache gehören
mehrere Dinge. Wir möchten z.B. sicherstellen, dass SSL-relevante Parameter
vorhanden sind, dass die Zertifikats- und Schlüsseldateien existieren und die
richtigen sind (z.B. anhand des CommonNames).
Letzteres können wir durch ein Serverspec `command` erreichen, was openssl
ausführt um das Zertifikat auszulesen und anzuzeigen. Im Block selber verwenden
wir Matcher, um den Inhalt zu prüfen.

```ruby

  describe file "/etc/ssl/mykey.crt" do
    it { should be_file }
    it { should be_mode         '644' }
    it { should be_owned_by     'root' }
    it { should be_grouped_into 'root' }
  end

  describe command 'openssl x509 -in /etc/ssl/mykey.cert -text' do
    it { should return_exit_status 0 }
    its(:stdout) { should match /Subject:.*example.com/ }
  end

```

Und wir möchten gerne die Schlüsselstärke der SSL-Schlüssel verifizieren und
schauen, ob der Schlüssel selber valide ist:

```ruby

describe command "openssl rsa -in /etc/ssl/mykey.key -check" do
  its(:stdout) { should match /^RSA key ok$/ }
  it { should return_exit_status 0 }
end
```

# SSL-Zertifikate als Resourcen beschreiben

Nun ist der Aufruf von openssl und das heraus-greppen der gewünschten Informationen
zwar möglich, aber immerhin unschön. Hier wünsche ich mir eher so etwas wie


```ruby

describe sslcertificate 'xyz.crt' do
  its(:subject) { should match /.../ }
  its(:key_strength) { should be_at_least 2048 }
  its(:validity) { should ... }
end

describe rsakey 'xyz.key' do
  it { should be_valid }
  it { should be_restricted_to 'root' }
end


```

Das funktioniert in serverspec nur mit einem eigenen Resource Type. In einem
der folgenden Posts machen wir uns an die Umsetzung.

--
Andreas

# NodeShellServer

NodeJS based persistent, unstoppable and secure Shell Server providing RESTful 
services to commands.

While working with many projects, I came across a requirement when I needed to 
keep a secure shell access to a server for running commands but via REST so that
an web application can be built for doing certain tasks.

It started as a minor project, but then quickly grew to include a lot many tasks.
I have tried to have too many dependency, not that its a problem, just to keep the
project small and agile.


## Example Usage
+ Collection system state, information and services to a central portal.
++ http://localhost:8090/?cmd=users
++ http://localhost:8090/?cmd=netstat -p --inet
++ http://localhost:8090/?cmd=ps -aux
+ Assigning and enforcing security policies for all computers.
+ Updates and patch releases to each computer registered on portal.
+ Controls security and remote access to the registered computer.

## Todos
+ Multi command support
+ Advanced middleware

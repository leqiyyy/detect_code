| 语言类型          | 系统调用来源                                      | 分析方法                                      |
|-------------------|--------------------------------------------------|-----------------------------------------------|
| C/C++             | glibc、musl-libc、直接 syscall                    | 静态分析二进制 + objdump + libc-to-syscall    |
| Go（默认模式）    | Go 自带 syscall、runtime 包                       | 源码分析 + callgraph                          |
| Go（c-shared）    | glibc                                            | 静态分析二进制 + libc-to-syscall              |
| Java              | JVM 二进制（java） + 动态库                       | 分析 JVM 二进制及依赖库                       |
| NodeJS            | node 二进制 + 动态库                             | 分析 node 二进制及依赖库                      |
| Python、Perl      | 解释器二进制 + 动态库                            | 分析解释器二进制及依赖库                     |
